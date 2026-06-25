import { describe, it, expect } from "vitest";
import { z } from "zod";

const NotificationTypes = z.enum([
  "prescription_approved",
  "prescription_rejected",
  "refill_reminder",
  "order_confirmed",
  "system_alert",
]);

const sendInput = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
  type: NotificationTypes,
  data: z.record(z.string(), z.any()).optional(),
});

describe("sendNotification input validation", () => {
  it("accepts a valid payload", () => {
    expect(() =>
      sendInput.parse({
        userId: "00000000-0000-0000-0000-000000000001",
        title: "تمت الموافقة",
        body: "تمت الموافقة على روشتتك",
        type: "prescription_approved",
      }),
    ).not.toThrow();
  });

  it("rejects unknown notification type", () => {
    expect(() =>
      sendInput.parse({
        userId: "00000000-0000-0000-0000-000000000001",
        title: "x",
        body: "y",
        type: "marketing_blast" as any,
      }),
    ).toThrow();
  });

  it("rejects title over 120 chars", () => {
    expect(() =>
      sendInput.parse({
        userId: "00000000-0000-0000-0000-000000000001",
        title: "x".repeat(121),
        body: "y",
        type: "system_alert",
      }),
    ).toThrow();
  });
});
