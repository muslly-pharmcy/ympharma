import { describe, it, expect } from "vitest";
import { validateProductListingReply } from "./whatsapp-reply-format";

describe("WhatsApp Agent reply format (SYSTEM_PROMPT rules)", () => {
  it("accepts a well-formed product listing reply", () => {
    const reply = [
      "إليك الأكثر توفراً اليوم:",
      "1. بنادول 500mg — السعر: 350 ر.ي 🟢 (متوفر 42)",
      "2. فيتامين C — السعر: 1200 ر.ي 🟡 (متوفر 6)",
      "3. شراب سعال — السعر: 800 ر.ي 🔴 (نفد)",
      '💡 للطلب أرسل: "طلب بنادول"',
    ].join("\n");
    const r = validateProductListingReply(reply);
    expect(r.issues).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("accepts a single-product stock check reply", () => {
    const reply = [
      "1. بنادول 500mg — السعر: 350 ر.ي 🟢 متوفر (42 علبة)",
      '💡 للطلب أرسل: "طلب بنادول"',
    ].join("\n");
    expect(validateProductListingReply(reply).ok).toBe(true);
  });

  it("flags missing numbered list", () => {
    const reply = 'بنادول متوفر 🟢 السعر 350 ر.ي\n💡 للطلب أرسل: "طلب بنادول"';
    expect(validateProductListingReply(reply).issues).toContain("missing_numbered_list");
  });

  it("flags missing stock emoji", () => {
    const reply = '1. بنادول — 350 ر.ي\n💡 للطلب أرسل: "طلب بنادول"';
    expect(validateProductListingReply(reply).issues).toContain("missing_stock_emoji");
  });

  it("flags SAR currency (ر.س) as forbidden and missing YER", () => {
    const reply = '1. بنادول — 350 ر.س 🟢\n💡 للطلب أرسل: "طلب بنادول"';
    const r = validateProductListingReply(reply);
    expect(r.issues).toContain("forbidden_sar_currency");
    expect(r.issues).toContain("missing_yer_currency");
  });

  it("flags missing order CTA", () => {
    const reply = "1. بنادول — السعر: 350 ر.ي 🟢";
    expect(validateProductListingReply(reply).issues).toContain("missing_order_cta");
  });
});
