// Unit tests for runDlqAlertCheck — verifies threshold gating, alert insertion
// with hour-bucket dedupe, and admin/owner notification fan-out.
import { describe, it, expect, vi } from "vitest";
import { runDlqAlertCheck } from "@/routes/api/public/hooks/dlq-alerts";

type Op = { fn: string; args: unknown };

function makeAdmin(opts: { activeCount: number; recentCount: number; admins?: string[] }) {
  const ops: Op[] = [];
  let countCallIdx = 0;

  const builder = (table: string) => {
    const state: {
      gte?: boolean;
    } = {};
    const api: Record<string, unknown> = {};
    api.select = (_cols: string, options?: { count?: string; head?: boolean }) => {
      if (options?.count) {
        // First count call → active, second → recent (matches dlq-alerts order).
        return {
          is: () => ({
            gte: () => {
              state.gte = true;
              ops.push({ fn: `${table}.count.recent`, args: {} });
              countCallIdx += 1;
              return Promise.resolve({ count: opts.recentCount, error: null });
            },
            then: (resolve: (v: { count: number; error: null }) => void) => {
              ops.push({ fn: `${table}.count.active`, args: {} });
              countCallIdx += 1;
              return resolve({ count: opts.activeCount, error: null });
            },
          }),
        };
      }
      // For user_roles select chain
      return {
        in: (_col: string, _vals: string[]) => {
          ops.push({ fn: `${table}.select.in`, args: _vals });
          return Promise.resolve({
            data: (opts.admins ?? []).map((id) => ({ user_id: id })),
            error: null,
          });
        },
      };
    };
    api.upsert = (row: unknown, options: unknown) => {
      ops.push({ fn: `${table}.upsert`, args: { row, options } });
      return Promise.resolve({ error: null });
    };
    api.insert = (rows: unknown) => {
      ops.push({ fn: `${table}.insert`, args: rows });
      return Promise.resolve({ error: null });
    };
    return api;
  };

  const admin = {
    from: vi.fn((t: string) => builder(t)),
  };
  return { admin, ops, get countCallIdx() { return countCallIdx; } };
}

describe("runDlqAlertCheck", () => {
  it("does not alert when recent count is below threshold", async () => {
    const { admin, ops } = makeAdmin({ activeCount: 12, recentCount: 2 });
    const res = await runDlqAlertCheck(admin, 5);
    expect(res.alerted).toBe(false);
    expect(res.dlq_active).toBe(12);
    expect(res.new_last_hour).toBe(2);
    expect(ops.some((o) => o.fn.includes("upsert"))).toBe(false);
    expect(ops.some((o) => o.fn === "notifications.insert")).toBe(false);
  });

  it("opens an alert and notifies admins when threshold crossed", async () => {
    const { admin, ops } = makeAdmin({
      activeCount: 30,
      recentCount: 8,
      admins: ["u1", "u2"],
    });
    const res = await runDlqAlertCheck(admin, 5);
    expect(res.alerted).toBe(true);
    expect(res.new_last_hour).toBe(8);
    expect(res.dedupe_key).toMatch(/^dlq_burst:\d{4}-\d{2}-\d{2}T\d{2}$/);
    expect(res.notified_users).toBe(2);
    expect(ops.some((o) => o.fn === "operations_alerts.upsert")).toBe(true);
    expect(ops.some((o) => o.fn === "notifications.insert")).toBe(true);
  });

  it("marks severity critical when recent count is 4x threshold", async () => {
    const { admin, ops } = makeAdmin({ activeCount: 100, recentCount: 25, admins: ["u1"] });
    const res = await runDlqAlertCheck(admin, 5);
    expect(res.alerted).toBe(true);
    const upsert = ops.find((o) => o.fn === "operations_alerts.upsert") as
      | { args: { row: { severity: string } } }
      | undefined;
    expect(upsert?.args.row.severity).toBe("critical");
  });
});
