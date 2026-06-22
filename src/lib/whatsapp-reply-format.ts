// Validates that a WhatsApp Agent reply (for product/stock listings) follows
// the Arabic formatting rules baked into SYSTEM_PROMPT:
//   - numbered list (1. 2. 3.)
//   - stock indicator emoji (🟢 / 🟡 / 🔴)
//   - YER currency "ر.ي" — never "ر.س"
//   - CTA line: 💡 للطلب أرسل: "طلب ..."
//
// Used by integration tests and can be used at runtime as a soft check.

export type ReplyFormatIssue =
  | "missing_numbered_list"
  | "missing_stock_emoji"
  | "missing_yer_currency"
  | "forbidden_sar_currency"
  | "missing_order_cta";

export type ReplyFormatResult = {
  ok: boolean;
  issues: ReplyFormatIssue[];
};

const NUMBERED_LIST_RE = /(^|\n)\s*1[\.\-\)]\s+\S/;
const STOCK_EMOJI_RE = /[🟢🟡🔴]/u;
// Require the dot so we don't match Arabic words like "أرسل" (ر-س).
const YER_RE = /ر\.\s?ي/;
const SAR_RE = /ر\.\s?س/;
const CTA_RE = /💡\s*للطلب.*طلب/;

export function validateProductListingReply(reply: string): ReplyFormatResult {
  const issues: ReplyFormatIssue[] = [];
  if (!NUMBERED_LIST_RE.test(reply)) issues.push("missing_numbered_list");
  if (!STOCK_EMOJI_RE.test(reply)) issues.push("missing_stock_emoji");
  if (!YER_RE.test(reply)) issues.push("missing_yer_currency");
  if (SAR_RE.test(reply)) issues.push("forbidden_sar_currency");
  if (!CTA_RE.test(reply)) issues.push("missing_order_cta");
  return { ok: issues.length === 0, issues };
}
