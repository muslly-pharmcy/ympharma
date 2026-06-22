// Allowed WhatsApp numbers for the bot (test/production gating).
// Use isAllowedWhatsAppNumber() inside webhook/agent entry points to gate access.

export const ALLOWED_WHATSAPP_NUMBERS: string[] = [
  "+967782878280", // رقم الاختبار الأساسي
  "+967773934270", // رقم الاختبار الثانوي
  "+967774068936", // رقم جديد
];

function normalize(num: string): string {
  const trimmed = (num || "").trim();
  if (!trimmed) return "";
  return trimmed.startsWith("+") ? trimmed : `+${trimmed.replace(/^00/, "")}`;
}

export function isAllowedWhatsAppNumber(phoneNumber: string): boolean {
  const envList = (process.env.WHATSAPP_ALLOWED_NUMBERS || "")
    .split(",")
    .map((s) => normalize(s))
    .filter(Boolean);
  const allowed = new Set<string>([
    ...ALLOWED_WHATSAPP_NUMBERS.map(normalize),
    ...envList,
  ]);
  return allowed.has(normalize(phoneNumber));
}
