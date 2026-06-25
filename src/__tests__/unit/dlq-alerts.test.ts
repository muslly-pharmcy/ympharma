// src/__tests__/unit/dlq-alerts.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabaseFrom = vi.fn();
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: mockSupabaseFrom,
  },
}));

vi.mock("@/lib/cron-auth.server", () => ({
  verifyCronSecret: vi.fn(),
}));

import { POST } from "@/routes/api/public/hooks/dlq-alerts";

describe("DLQ Alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if cron secret is missing", async () => {
    const request = new Request("http://localhost", { method: "POST", headers: {} });
    const response = await (POST as any)({ request });
    expect(response.status).toBe(401);
  });

  it("should process DLQ events and send alerts to all admins", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "agent_events_dlq") {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    { id: "evt-1", event_name: "OrderFailed", error: "Insufficient stock", created_at: new Date().toISOString() },
                    { id: "evt-2", event_name: "PaymentFailed", error: "Timeout", created_at: new Date().toISOString() },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "user_roles") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ user_id: "admin-1" }, { user_id: "admin-2" }, { user_id: "owner-1" }],
              error: null,
            }),
          }),
        };
      }
      if (table === "operations_alerts") {
        return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "x-cron-secret": "test-secret" },
    });

    const response = await (POST as any)({ request });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.alerts_sent).toBe(3);
    expect(data.failed_count).toBe(2);
  });

  it("should handle no failed events gracefully", async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "agent_events_dlq") {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "x-cron-secret": "test-secret" },
    });

    const response = await (POST as any)({ request });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.alerts_sent).toBe(0);
    expect(data.failed_count).toBe(0);
  });
});
