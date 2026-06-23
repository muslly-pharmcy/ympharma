# n8n Workflows — Daily Social Posting

This project sends posts to n8n and receives callbacks. The shared HMAC secret is `N8N_CALLBACK_SECRET` (stored in Lovable Cloud).

Base URL: `https://ympharma.lovable.app`

---

## Endpoints exposed by the app

### 1. Outbound to n8n (you build this webhook in n8n)
**Trigger:** Webhook node, method `POST`, path `/social/publish`

Body shape received from the app (per post):
```json
{
  "event": "publish",
  "post_id": "uuid",
  "platform": "facebook | instagram | twitter | telegram",
  "caption": "النص مع الهاشتاغات",
  "cta": "اشترِ من muslly.com",
  "product_id": "uuid | null"
}
```

After publishing, n8n should call back the app:

```http
POST https://ympharma.lovable.app/api/public/hooks/social-callback
Content-Type: application/json
x-n8n-signature: sha256=<HMAC_HEX>
```

`HMAC_HEX = HMAC_SHA256(N8N_CALLBACK_SECRET, raw_request_body)` — computed over the EXACT bytes sent.

Body:
```json
{ "event": "published", "post_id": "uuid", "external_id": "<id from platform>" }
```
or on failure:
```json
{ "event": "failed", "post_id": "uuid", "error": "reason" }
```

The endpoint is idempotent: replaying the same `(post_id, external_id)` `published` event is a no-op.

### 2. Stats refresh (cron-driven)
Every hour the app calls a second n8n webhook with the list of recently-published posts:

**Trigger:** Webhook node, method `POST`, path `/social/stats-refresh`
Set `N8N_STATS_WEBHOOK_URL` in Lovable Cloud (or reuse `N8N_WEBHOOK_URL` and branch on `event`).

Body received:
```json
{
  "event": "stats_refresh",
  "items": [
    { "post_id": "uuid", "platform": "facebook", "external_id": "..." }
  ]
}
```

For each item n8n queries the platform API and POSTs back to `/api/public/hooks/social-callback` with HMAC:
```json
{
  "event": "stats",
  "post_id": "uuid",
  "likes": 12, "comments": 3, "shares": 1, "views": 540
}
```

---

## Building the workflow in n8n (high level)

### Workflow A — Publish
1. **Webhook** (POST `/social/publish`)
2. **Switch** on `{{$json.platform}}` → 4 branches
3. **Facebook Graph API**: `POST /{page-id}/feed { message }` → returns `id`
4. **Instagram**: 2-step (create container → publish)
5. **Twitter/X**: `POST /2/tweets { text }` → returns `data.id`
6. **Telegram**: `POST https://api.telegram.org/bot<TOKEN>/sendMessage`
7. **Function node** — compute HMAC:
   ```js
   const crypto = require('crypto');
   const body = JSON.stringify({ event: 'published', post_id: $('Webhook').item.json.post_id, external_id: $json.id });
   const sig = crypto.createHmac('sha256', $env.N8N_CALLBACK_SECRET).update(body).digest('hex');
   return [{ json: { body, signature: `sha256=${sig}` } }];
   ```
8. **HTTP Request** (POST callback URL) — send the raw `body` string with header `x-n8n-signature`.

On any error branch, send `event: "failed"` with the same HMAC pattern.

### Workflow B — Stats refresh
1. **Webhook** (POST `/social/stats-refresh`)
2. **SplitInBatches** over `items`
3. **Switch** on platform → call each API for insights
4. **Function** → build HMAC-signed callback as above with `event: "stats"`
5. **HTTP Request** → callback URL

---

## Platform credential checklist

| Platform | What n8n needs |
|---|---|
| Facebook | Page access token + page ID |
| Instagram | Business account ID + page token (via Facebook Graph) |
| Twitter/X | OAuth 1.0a or Bearer token (v2 API) |
| Telegram | Bot token + channel/chat ID |

Store these inside n8n credentials — **not** in Lovable Cloud.

---

## Local testing the callback (no n8n)

```bash
SECRET='YOUR_N8N_CALLBACK_SECRET'
BODY='{"event":"published","post_id":"<uuid>","external_id":"fb_123"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $2}')
curl -X POST https://ympharma.lovable.app/api/public/hooks/social-callback \
  -H "Content-Type: application/json" \
  -H "x-n8n-signature: sha256=$SIG" \
  --data "$BODY"
```
