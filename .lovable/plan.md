# WhatsApp Brain Integration — Meta Cloud API

Wire your WhatsApp number to `SuperBrainSovereign` through a public TanStack server route (not a Supabase edge function — this stack uses TanStack Start).

## Endpoint

`src/routes/api/public/hooks/whatsapp/brain.ts`

- `GET` → Meta webhook verification (checks `hub.verify_token` against `WHATSAPP_VERIFY_TOKEN`, echoes `hub.challenge`).
- `POST` → receives WhatsApp messages, runs the brain, replies via Graph API.

Under `/api/public/*` so Meta can reach it without auth (as required by webhooks). Security is enforced inside the handler.

## Handler flow (POST)

1. Parse Meta payload; extract `from` (E.164) and `text.body`.
2. **Allowlist check**: look up `from` in a new `wa_allowlist` table. If not allowed → reply "غير مصرح" and stop.
3. **Log inbound** into existing `whatsapp_messages`.
4. Call the brain. Since `executeNeuralInference` requires `requireSupabaseAuth`, the route can't call it directly (no bearer). Instead:
   - Import the pure `decide()` from `@/modules/ai-brain/services/SuperBrainSovereign`.
   - Build a lightweight `BrainAdapter` using `supabaseAdmin` (loaded inside handler via `await import`) that calls `pn_search_medicine_nearby` and `search_medicines_public`.
   - Manually insert the resulting decision into `ai_neural_synaptic_log` with `user_id = null` and `trigger_source = 'WHATSAPP_INBOUND'`.
5. Format Arabic reply (safety / alt / logistic / marketing / speed).
6. POST to `https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages` with Bearer token.
7. Log outbound + always return `200 {ok:true}` to Meta (never 500, to avoid retries loops); errors are logged internally.

## Database (one migration)

```sql
CREATE TABLE public.wa_allowlist (
  phone text PRIMARY KEY,
  label text,
  district text DEFAULT 'عدن',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_allowlist TO authenticated;
GRANT ALL ON public.wa_allowlist TO service_role;
ALTER TABLE public.wa_allowlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage wa allowlist"
  ON public.wa_allowlist FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
```

Allow `ai_neural_synaptic_log.user_id` to be nullable if it isn't already (webhook has no user).

## Secrets (via `add_secret`)

- `WHATSAPP_API_TOKEN` — Meta permanent access token
- `WHATSAPP_PHONE_NUMBER_ID` — Meta phone number ID
- `WHATSAPP_VERIFY_TOKEN` — a strong random string you also paste into Meta webhook config

## After build

1. You add your phone(s) to `wa_allowlist` from the admin (I'll add a tiny form at `/admin-hub` in a follow-up if you want, otherwise via SQL).
2. In Meta developer console:
   - Webhook URL: `https://ympharma.lovable.app/api/public/hooks/whatsapp/brain`
   - Verify token: value of `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to `messages`.
3. Send a WhatsApp message → get a brain response.

## Out of scope for this slice

- Admin UI for allowlist (SQL for now).
- Twilio provider (deferred as you requested).
- Media/voice messages (text only for now).
- Rate limiting (allowlist is the first line).
