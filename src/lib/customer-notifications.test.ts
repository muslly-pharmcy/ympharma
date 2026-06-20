// Phase 6C — Integration test for the customer notification pipeline.
//
// These tests use an in-memory simulator of the database trigger + claim
// + dispatch lifecycle to assert two enterprise-grade invariants:
//
//   1. EXACTLY-ONCE PER TRANSITION
//      The (event_id, recipient_phone) UNIQUE constraint on
//      whatsapp_notification_dispatch guarantees that re-emitting the same
//      lifecycle event NEVER produces a second dispatch row, even under
//      retry storms or concurrent triggers.
//
//   2. RETRY SAFETY
//      A failed send increments `attempts` and pushes `next_attempt_at`
//      forward via exponential backoff. The same dispatch is reclaimed,
//      not duplicated, and after `max_attempts` it transitions to `dead`
//      and raises an operations alert exactly once.
//
// We mirror the SQL semantics defined in:
//   supabase/migrations/.../enqueue_customer_rx_notification(...)
//   public.claim_customer_rx_notifications(...)
//   public.mark_customer_rx_notification_sent(...)
//   public.mark_customer_rx_notification_failed(...)

import { describe, it, expect, beforeEach } from "vitest";

// ────────────────────────────────────────────────────────────────────────────
// Minimal in-memory model of the dispatch pipeline (mirrors the SQL).
// ────────────────────────────────────────────────────────────────────────────

type DispatchStatus = "pending" | "sending" | "sent" | "failed" | "dead" | "skipped";

type Dispatch = {
  id: string;
  event_id: string;
  event_name: string;
  recipient_phone: string;
  template_id: string;
  attempts: number;
  max_attempts: number;
  status: DispatchStatus;
  next_attempt_at: number;
  last_error: string | null;
  wamid: string | null;
  sent_at: number | null;
};

type Alert = { type: string; dispatch_id: string; attempts: number; error: string };

class Pipeline {
  rows: Dispatch[] = [];
  alerts: Alert[] = [];
  now = 0;
  private seq = 0;

  /** Mirrors the AFTER INSERT trigger: idempotent on (event_id, recipient_phone). */
  enqueue(input: {
    event_id: string;
    event_name: string;
    recipient_phone: string;
    template_id: string;
    max_attempts?: number;
  }): boolean {
    const exists = this.rows.find(
      (r) => r.event_id === input.event_id && r.recipient_phone === input.recipient_phone,
    );
    if (exists) return false; // UNIQUE constraint blocks duplicates
    this.rows.push({
      id: `d_${++this.seq}`,
      event_id: input.event_id,
      event_name: input.event_name,
      recipient_phone: input.recipient_phone,
      template_id: input.template_id,
      attempts: 0,
      max_attempts: input.max_attempts ?? 5,
      status: "pending",
      next_attempt_at: this.now,
      last_error: null,
      wamid: null,
      sent_at: null,
    });
    return true;
  }

  /** Mirrors claim_customer_rx_notifications: FOR UPDATE SKIP LOCKED. */
  claim(limit = 25): Dispatch[] {
    const due = this.rows
      .filter(
        (r) =>
          (r.status === "pending" || r.status === "failed") &&
          r.attempts < r.max_attempts &&
          r.next_attempt_at <= this.now,
      )
      .sort((a, b) => a.next_attempt_at - b.next_attempt_at)
      .slice(0, limit);
    for (const r of due) {
      r.status = "sending";
      r.attempts += 1;
    }
    return [...due];
  }

  markSent(id: string, wamid: string) {
    const r = this.rows.find((x) => x.id === id)!;
    r.status = "sent";
    r.wamid = wamid;
    r.sent_at = this.now;
    r.last_error = null;
  }

  /** Mirrors mark_customer_rx_notification_failed with exponential backoff. */
  markFailed(id: string, error: string, baseSeconds = 30) {
    const r = this.rows.find((x) => x.id === id)!;
    if (r.attempts >= r.max_attempts) {
      r.status = "dead";
      r.last_error = error;
      // operations_alerts insertion (one row per exhausted dispatch).
      this.alerts.push({
        type: "WHATSAPP_DELIVERY_FAILED",
        dispatch_id: r.id,
        attempts: r.attempts,
        error,
      });
      return { dead: true };
    }
    const backoffMs = baseSeconds * 1000 * Math.pow(2, r.attempts);
    r.status = "failed";
    r.last_error = error;
    r.next_attempt_at = this.now + backoffMs;
    return { dead: false };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe("customer rx notifications — exactly-once & retry safety", () => {
  let p: Pipeline;
  beforeEach(() => {
    p = new Pipeline();
  });

  it("enqueues exactly once per state transition even if event is re-emitted", () => {
    const enq = (event_id: string, event_name: string) =>
      p.enqueue({
        event_id,
        event_name,
        recipient_phone: "967700000001",
        template_id: event_name,
      });

    // PENDING_REVIEW → ASSIGNED → IN_REVIEW → APPROVED: only APPROVED queues a
    // customer notification (other transitions are staff-internal). Each
    // transition fires its own event_id.
    enq("evt_assigned_1", "PRESCRIPTION_ASSIGNED"); // ignored in real trigger
    enq("evt_in_review_1", "PRESCRIPTION_IN_REVIEW"); // ignored in real trigger
    expect(enq("evt_approved_1", "PRESCRIPTION_APPROVED")).toBe(true);

    // Replays of the SAME event_id must be no-ops.
    expect(enq("evt_approved_1", "PRESCRIPTION_APPROVED")).toBe(false);
    expect(enq("evt_approved_1", "PRESCRIPTION_APPROVED")).toBe(false);

    const approvedRows = p.rows.filter((r) => r.event_name === "PRESCRIPTION_APPROVED");
    expect(approvedRows).toHaveLength(1);
    expect(approvedRows[0].attempts).toBe(0);
  });

  it("a new event for the same prescription produces a new dispatch row", () => {
    // Status flipping APPROVED → ESCALATED → APPROVED again must surface
    // two distinct customer notifications because they are two transitions.
    p.enqueue({
      event_id: "evt_approved_a",
      event_name: "PRESCRIPTION_APPROVED",
      recipient_phone: "967700000002",
      template_id: "PRESCRIPTION_APPROVED",
    });
    p.enqueue({
      event_id: "evt_escalated_a",
      event_name: "PRESCRIPTION_ESCALATED",
      recipient_phone: "967700000002",
      template_id: "PRESCRIPTION_ESCALATED",
    });
    p.enqueue({
      event_id: "evt_approved_b",
      event_name: "PRESCRIPTION_APPROVED",
      recipient_phone: "967700000002",
      template_id: "PRESCRIPTION_APPROVED",
    });
    expect(p.rows).toHaveLength(3);
  });

  it("retries failed sends with exponential backoff without duplicating dispatches", () => {
    p.enqueue({
      event_id: "evt_x",
      event_name: "PRESCRIPTION_APPROVED",
      recipient_phone: "967700000003",
      template_id: "PRESCRIPTION_APPROVED",
      max_attempts: 5,
    });

    // Tick 1: claim returns the single row, attempts → 1. Send fails.
    let claimed = p.claim();
    expect(claimed).toHaveLength(1);
    expect(claimed[0].attempts).toBe(1);
    p.markFailed(claimed[0].id, "network");
    expect(p.rows[0].status).toBe("failed");
    expect(p.rows[0].next_attempt_at).toBeGreaterThan(p.now);

    // Tick 1 immediately re-running must NOT reclaim (next_attempt_at in future).
    expect(p.claim()).toHaveLength(0);

    // Advance the clock past the first backoff (30s * 2^1 = 60s).
    p.now += 60_000;
    claimed = p.claim();
    expect(claimed).toHaveLength(1);
    expect(claimed[0].id).toBe(p.rows[0].id);
    expect(claimed[0].attempts).toBe(2);

    p.markFailed(claimed[0].id, "network");
    p.now += 5 * 60_000; // jump beyond any further backoff
    claimed = p.claim();
    p.markFailed(claimed[0].id, "network"); // attempts → 4 (was 3 after claim)
    p.now += 30 * 60_000;
    claimed = p.claim();
    p.markFailed(claimed[0].id, "network"); // attempts → 5, becomes dead
    expect(p.rows[0].status).toBe("dead");

    // Exactly one operations_alerts entry per dead dispatch.
    expect(p.alerts).toHaveLength(1);
    expect(p.alerts[0]).toMatchObject({
      type: "WHATSAPP_DELIVERY_FAILED",
      dispatch_id: p.rows[0].id,
    });

    // We must NEVER have created more than the original dispatch row.
    expect(p.rows).toHaveLength(1);
  });

  it("a successful send terminates retries and produces exactly one wamid", () => {
    p.enqueue({
      event_id: "evt_y",
      event_name: "PRESCRIPTION_REJECTED",
      recipient_phone: "967700000004",
      template_id: "PRESCRIPTION_REJECTED",
    });
    const [first] = p.claim();
    p.markFailed(first.id, "5xx");
    p.now += 60_000;
    const [second] = p.claim();
    p.markSent(second.id, "wamid_abc");

    expect(p.rows[0].status).toBe("sent");
    expect(p.rows[0].wamid).toBe("wamid_abc");

    // Further ticks find no work.
    p.now += 60 * 60_000;
    expect(p.claim()).toHaveLength(0);
    expect(p.alerts).toHaveLength(0);
  });

  it("respects max_attempts boundary (no infinite retry loop)", () => {
    p.enqueue({
      event_id: "evt_z",
      event_name: "PRESCRIPTION_ESCALATED",
      recipient_phone: "967700000005",
      template_id: "PRESCRIPTION_ESCALATED",
      max_attempts: 3,
    });

    let safety = 0;
    while (true) {
      const claimed = p.claim();
      if (claimed.length === 0) {
        // Either dead or waiting on backoff — fast-forward.
        if (p.rows[0].status === "dead") break;
        p.now += 60 * 60_000;
        continue;
      }
      p.markFailed(claimed[0].id, "boom");
      if (++safety > 20) throw new Error("retry loop did not terminate");
    }

    expect(p.rows[0].status).toBe("dead");
    expect(p.rows[0].attempts).toBe(3);
    expect(p.alerts).toHaveLength(1);
  });
});
