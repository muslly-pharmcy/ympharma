## Twilio WhatsApp → SuperBrain Webhook (Adapted to TanStack Start)

Your stack does not use Supabase Edge Functions for app logic. The existing Meta Cloud API webhook lives at `src/routes/api/public/hooks/whatsapp/brain.ts`. I'll add a parallel Twilio endpoint that follows the same pattern and reuses the real `SuperBrainSovereign` engine and `wa_allowlist`.

### What I'll build

1. **New public route** `src/routes/api/public/hooks/whatsapp/twilio.ts`
   - `POST` handler parsing `application/x-www-form-urlencoded` (Twilio's format) via `request.formData()`.
   - Extract `From` (strip `whatsapp:` prefix, keep E.164) and `Body`.
   - Verify Twilio signature using `X-Twilio-Signature` header + `TWILIO_AUTH_TOKEN` (HMAC-SHA1 over URL + sorted POST params). Reject with 403 if invalid.
   - Check sender against `public.wa_allowlist` (active = true) using `supabaseAdmin` (dynamic import inside handler). Silently 200 with empty TwiML if not allowed.
   - Call the real engine: `executeNeuralInference({ patientId: from, message: body, district: allowlist.district ?? 'عدن' })` from `src/modules/ai-brain/services/executeNeuralInference.functions.ts` — invoke the underlying server logic directly (not the RPC stub).
   - Format Arabic response mirroring the blueprint (decision, safety alternative, logistic branch/ETA, marketing trigger, speed).
   - XML-escape the response body before embedding in TwiML.
   - Return `<Response><Message>…</Message></Response>` with `Content-Type: text/xml`.

2. **Secret**: add `TWILIO_AUTH_TOKEN` via `secrets--add_secret` (request from user during build).

3. **Docs**: append a short section to `docs/engineering/reports/` describing the Twilio webhook URL:
   `https://ympharma.lovable.app/api/public/hooks/whatsapp/twilio` — to configure in Twilio Console → WhatsApp Sandbox / Sender → "When a message comes in".

### What I will NOT do

- Won't create `supabase/functions/whatsapp-brain/index.ts` — Deno edge functions aren't the runtime for app logic here, and they can't import from `src/` in this project.
- Won't change the existing Meta webhook or the SuperBrain engine code.
- Won't broaden `wa_allowlist` access.

### Technical notes

- Signature check uses Node `crypto` (available under nodejs_compat): `HMAC-SHA1(authToken, fullUrl + concatenatedSortedParams)` → base64, compared timing-safe to the header.
- Full URL must be the public URL Twilio called (reconstruct from `x-forwarded-proto` + `host` + pathname).
- Allowlist lookup + engine call already exist; we're reusing them exactly like the Meta hook.

Confirm and I'll implement, plus prompt you for the `TWILIO_AUTH_TOKEN` value.