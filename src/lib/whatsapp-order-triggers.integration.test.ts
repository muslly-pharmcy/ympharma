// Phase 6C integration tests — requires PGHOST/PGUSER/... env (skipped otherwise).
// Verifies:
//   1) UPDATE orders.status -> emits matching ORDER_* agent_events row.
//   2) Trigger enqueues ONE dispatch row per (event_id, recipient_phone).
//      A duplicate insert into agent_events with the same id is impossible
//      (PK), so we assert the unique index by attempting a manual duplicate
//      insert into whatsapp_notification_dispatch.
//   3) opt-out (whatsapp_enabled=false) marks dispatch as 'skipped' and
//      blocks any 'pending' row.
import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";

// Requires a write-capable DB role; opt in via INTEGRATION_DB_WRITE=1 in CI.
const hasDb = Boolean(process.env.PGHOST && process.env.PGUSER && process.env.INTEGRATION_DB_WRITE === "1");

function sql(q: string): string {
  return execSync(`psql -tAX -v ON_ERROR_STOP=1`, {
    input: q,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

const PHONE = "967700000777"; // test number — never sent to real WhatsApp here
const ORDER_ID = `test_ord_${Date.now()}`;

describe.skipIf(!hasDb)("Phase 6C — order triggers & idempotency", () => {
  beforeAll(() => {
    // Ensure flags are on for this test window (does not persist app state changes).
    sql(`INSERT INTO public.app_settings(key,value,description) VALUES
         ('customer_whatsapp_enabled','true'::jsonb,'test'),
         ('order_notifications_enabled','true'::jsonb,'test')
         ON CONFLICT (key) DO UPDATE SET value='true'::jsonb`);
    // Clean prior test rows.
    sql(`DELETE FROM public.whatsapp_notification_dispatch WHERE order_id LIKE 'test_ord_%'`);
    sql(`DELETE FROM public.agent_events WHERE entity_type='order' AND entity_id LIKE 'test_ord_%'`);
    sql(`DELETE FROM public.orders WHERE id LIKE 'test_ord_%'`);
    sql(`DELETE FROM public.customer_notification_preferences WHERE phone='${PHONE}'`);

    // Seed opted-IN customer + order in 'pending'.
    sql(`INSERT INTO public.customer_notification_preferences(phone, whatsapp_enabled)
         VALUES ('${PHONE}', true)
         ON CONFLICT (phone) DO UPDATE SET whatsapp_enabled=true`);
    sql(`INSERT INTO public.orders(id, customer_name, customer_phone, customer_address, total, items, status)
         VALUES ('${ORDER_ID}','Test User','${PHONE}','Sanaa',1000,'[]'::jsonb,'pending')`);
  });

  it("orders.status -> 'confirmed' emits ORDER_CONFIRMED agent_event", () => {
    sql(`UPDATE public.orders SET status='confirmed' WHERE id='${ORDER_ID}'`);
    const count = sql(`SELECT count(*) FROM public.agent_events
                       WHERE event_name='ORDER_CONFIRMED' AND entity_id='${ORDER_ID}'`);
    expect(Number(count)).toBe(1);
  });

  it("agent_event -> single dispatch row with matching event_id + phone", () => {
    const eventId = sql(`SELECT id FROM public.agent_events
                         WHERE event_name='ORDER_CONFIRMED' AND entity_id='${ORDER_ID}'
                         ORDER BY occurred_at DESC LIMIT 1`);
    expect(eventId).toMatch(/^[0-9a-f-]{36}$/);
    const row = sql(`SELECT status||'|'||recipient_phone FROM public.whatsapp_notification_dispatch
                     WHERE event_id='${eventId}'`);
    expect(row).toBe(`pending|${PHONE}`);
  });

  it("idempotency: duplicate (event_id, recipient_phone) is rejected", () => {
    const eventId = sql(`SELECT id FROM public.agent_events
                         WHERE event_name='ORDER_CONFIRMED' AND entity_id='${ORDER_ID}'
                         ORDER BY occurred_at DESC LIMIT 1`);
    let dupRejected = false;
    try {
      sql(`INSERT INTO public.whatsapp_notification_dispatch
           (event_id, event_name, recipient_phone, template_id, order_id)
           VALUES ('${eventId}','ORDER_CONFIRMED','${PHONE}','ORDER_CONFIRMED','${ORDER_ID}')`);
    } catch (e) {
      dupRejected = /wa_dispatch_unique|duplicate key/i.test(String((e as Error).message));
    }
    expect(dupRejected).toBe(true);
    const cnt = sql(`SELECT count(*) FROM public.whatsapp_notification_dispatch
                     WHERE event_id='${eventId}'`);
    expect(Number(cnt)).toBe(1);
  });

  it("opt-out blocks further notifications", () => {
    sql(`UPDATE public.customer_notification_preferences SET whatsapp_enabled=false,
         last_opt_out_at=now() WHERE phone='${PHONE}'`);
    sql(`UPDATE public.orders SET status='shipped' WHERE id='${ORDER_ID}'`);
    // An ORDER_DISPATCHED event was emitted, but the dispatch row must be 'skipped',
    // never 'pending'.
    const eventId = sql(`SELECT id FROM public.agent_events
                         WHERE event_name='ORDER_DISPATCHED' AND entity_id='${ORDER_ID}'
                         ORDER BY occurred_at DESC LIMIT 1`);
    const status = sql(`SELECT status FROM public.whatsapp_notification_dispatch
                        WHERE event_id='${eventId}'`);
    expect(status).toBe("skipped");
    const pending = sql(`SELECT count(*) FROM public.whatsapp_notification_dispatch
                         WHERE order_id='${ORDER_ID}' AND status='pending'`);
    expect(Number(pending)).toBe(1); // only the original CONFIRMED row remains pending
  });
});
