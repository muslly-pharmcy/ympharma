// src/__tests__/unit/dlq-alerts.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { runDlqAlertCheck } from "@/routes/api/public/hooks/dlq-alerts";

function makeAdmin(opts: {
  failed: Array<{ id: string; event_name: string; last_error: string }>;
  admins?: string[];
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const from = (table: string): any => {
    if (table === "agent_events_dlq") {
      return {
        select: () => ({
          gte: () => ({
            is: () => ({
              order: () => Promise.resolve({ data: opts.failed, error: null }),
            }),
          }),
        }),
      };
    }
    if (table === "user_roles") {
      return {
        select: () => ({
          in: () =>
            Promise.resolve({
              data: (opts.admins ?? []).map((id) => ({ user_id: id })),
              error: null,
            }),
        }),
      };
    }
    if (table === "operations_alerts_v14") {
      return { upsert: () => Promise.resolve({ error: null }) };
    }
    return {};
  };
  return { from: vi.fn(from) };
}

describe("runDlqAlertCheck", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns zero alerts when no failed events", async () => {
    const admin = makeAdmin({ failed: [] });
    const res = await runDlqAlertCheck(admin);
    expect(res.alerts_sent).toBe(0);
    expect(res.failed_count).toBe(0);
  });

  it("notifies all admins and owners", async () => {
    const admin = makeAdmin({
      failed: [
        { id: "evt-1", event_name: "OrderFailed", last_error: "Insufficient stock" },
        { id: "evt-2", event_name: "PaymentFailed", last_error: "Timeout" },
      ],
      admins: ["admin-1", "admin-2", "owner-1"],
    });
    const res = await runDlqAlertCheck(admin);
    expect(res.failed_count).toBe(2);
    expect(res.alerts_sent).toBe(3);
    expect(res.errors).toHaveLength(2);
  });

  it("counts events but sends zero alerts when no admins exist", async () => {
    const admin = makeAdmin({
      failed: [{ id: "evt-1", event_name: "X", last_error: "err" }],
      admins: [],
    });
    const res = await runDlqAlertCheck(admin);
    expect(res.failed_count).toBe(1);
    expect(res.alerts_sent).toBe(0);
  });
});
