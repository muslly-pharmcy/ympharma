import { describe, it, expect } from "vitest";
import { EVENTS } from "@/core/events/constants";
import { IDENTITY_EVENTS, IdentityEventPayload } from "@/platform/identity/events";

describe("Phoenix Phase 3 — identity events", () => {
  it("registers every identity event in the central catalog", () => {
    for (const name of IDENTITY_EVENTS) {
      expect((EVENTS as Record<string, string>)[name]).toBe(name);
    }
  });

  it("payload schema requires org/actor/subject/branch (nullable) and data", () => {
    const parsed = IdentityEventPayload.parse({
      org_id: null,
      actor_user_id: "11111111-1111-1111-1111-111111111111",
      subject_user_id: "11111111-1111-1111-1111-111111111111",
      branch_id: null,
      data: { role: "pharmacist" },
    });
    expect(parsed.data.role).toBe("pharmacist");
  });

  it("payload rejects invalid uuids", () => {
    expect(() =>
      IdentityEventPayload.parse({ actor_user_id: "not-a-uuid" }),
    ).toThrow();
  });
});
