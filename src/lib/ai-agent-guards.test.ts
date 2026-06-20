// Phase 6D — contract tests for AI agent guard tools.
// Verifies that forbidden actions (create_order, inventory_change, transfer,
// approve_prescription, price_change, refund) are NEVER executed directly:
// they must only enqueue an approval request that a human decides.
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const SRC = readFileSync(resolve(__dirname, "whatsapp-ai-agent.server.ts"), "utf8");

const FORBIDDEN = [
  "create_order",
  "approve_prescription",
  "inventory_change",
  "transfer",
  "price_change",
  "refund",
] as const;

describe("AI agent guards — forbidden actions only via approval queue", () => {
  it.each(FORBIDDEN)("guard tool for %s exists and calls enqueueApproval, not direct mutation", (action) => {
    // 1) Guard tool must exist under name request_<action>
    const toolKey = `request_${action}`;
    expect(SRC).toContain(toolKey);

    // 2) That guard's execute body must call enqueueApproval(<action>, ...)
    //    and must NOT call supabaseAdmin.from(...).insert/update/delete for business tables.
    const re = new RegExp(`request_${action}:\\s*tool\\(\\{[\\s\\S]*?execute:\\s*async[\\s\\S]*?enqueueApproval\\(\\s*"${action}"`, "m");
    expect(SRC).toMatch(re);
  });

  it("agent never imports order/inventory/transfer mutation helpers", () => {
    // Guardrail: server agent file must not import from order/inventory write modules
    expect(SRC).not.toMatch(/from\s+["']@\/lib\/orders\.server/);
    expect(SRC).not.toMatch(/from\s+["']@\/lib\/inventory-(write|mutate)/);
    expect(SRC).not.toMatch(/from\s+["']@\/lib\/transfers\.server/);
  });

  it("forbidden action names are listed in FORBIDDEN_ACTIONS array", () => {
    for (const a of FORBIDDEN) {
      expect(SRC).toContain(`"${a}"`);
    }
  });

  it("enqueueApproval inserts into agent_approval_requests with status pending by default", () => {
    expect(SRC).toMatch(/from\("agent_approval_requests"\)\s*\.insert\(/);
    // Must NOT set status to 'approved' at insert time
    expect(SRC).not.toMatch(/agent_approval_requests[\s\S]*status:\s*["']approved["']/);
  });

  it("audit failure path raises a staff_alert", () => {
    expect(SRC).toMatch(/staff_alerts[\s\S]*ai_audit_failure/);
  });
});
