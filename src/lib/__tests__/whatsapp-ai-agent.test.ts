// Unit tests for the WhatsApp AI agent module. We mock the AI gateway and
// supabaseAdmin so tests are deterministic and don't touch the network/DB.
import { describe, test, expect, vi, beforeEach } from "vitest";

// --- Mocks --------------------------------------------------------------
const generateTextMock = vi.fn();
vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    generateText: (...args: unknown[]) => generateTextMock(...args),
  };
});

vi.mock("@/lib/ai-gateway.server", () => ({
  createLovableAiGatewayProvider: () => () => ({ id: "mock-model" }),
}));

const supaInsert = vi.fn().mockResolvedValue({ data: null, error: null });
const supaUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: supaInsert,
      update: supaUpdate,
    })),
  },
}));

import { runWhatsAppAgent, type AgentResult } from "@/lib/whatsapp-ai-agent.server";

const baseArgs = {
  apiKey: "test-key",
  conversationId: "00000000-0000-0000-0000-000000000001",
  phone: "+967782878280",
  history: [],
};

function mockReply(text: string) {
  generateTextMock.mockResolvedValueOnce({ text, toolCalls: [], finishReason: "stop" });
}

describe("runWhatsAppAgent", () => {
  beforeEach(() => {
    generateTextMock.mockReset();
    supaInsert.mockClear();
    supaUpdate.mockClear();
  });

  test("returns a reply for a search question", async () => {
    mockReply("النتائج: 1. بنادول 500mg 🟢");
    const result: AgentResult = await runWhatsAppAgent({ ...baseArgs, incoming: "ابحث عن بنادول" });
    expect(result.reply).toContain("بنادول");
    expect(result.correlationId).toBeTruthy();
    expect(result.escalated).toBe(false);
  });

  test("returns a reply for stock check", async () => {
    mockReply("نعم، متوفر 🟢");
    const result = await runWhatsAppAgent({ ...baseArgs, incoming: "هل يتوفر بنادول؟" });
    expect(result.reply).toBe("نعم، متوفر 🟢");
  });

  test("returns a help reply", async () => {
    mockReply("📌 الأوامر المتاحة: بحث، طلب، حالة الطلب");
    const result = await runWhatsAppAgent({ ...baseArgs, incoming: "مساعدة" });
    expect(result.reply).toContain("📌");
  });

  test("surfaces gateway errors without throwing", async () => {
    generateTextMock.mockRejectedValueOnce(new Error("boom"));
    const result = await runWhatsAppAgent({ ...baseArgs, incoming: "..." });
    expect(result.intent).toBe("error");
    expect(result.escalated).toBe(false);
  });

  test("returns a correlationId of UUID shape", async () => {
    mockReply("ok");
    const result = await runWhatsAppAgent({ ...baseArgs, incoming: "اختبار" });
    expect(result.correlationId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  test("includes toolCalls array in the result", async () => {
    mockReply("ok");
    const result = await runWhatsAppAgent({ ...baseArgs, incoming: "اختبار" });
    expect(Array.isArray(result.toolCalls)).toBe(true);
  });

  test("returns a string reply for arbitrary input", async () => {
    mockReply("مرحباً بك");
    const result = await runWhatsAppAgent({ ...baseArgs, incoming: "اهلا" });
    expect(typeof result.reply).toBe("string");
    expect(result.reply.length).toBeGreaterThan(0);
  });
});
