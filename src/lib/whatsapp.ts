export const WHATSAPP_NUMBER = "967782878280";

export function waLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(message: string) {
  if (typeof window === "undefined") return;
  window.open(waLink(message), "_blank", "noopener,noreferrer");
}

function nowAr() {
  const d = new Date();
  return d.toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
}

function trackUrl(orderId: string) {
  if (typeof window === "undefined") return `/track?id=${orderId}`;
  return `${window.location.origin}/track?id=${orderId}`;
}

export type OrderMsgInput = {
  orderId: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  customer: { name: string; phone: string; address: string; notes?: string };
};

export function buildOrderMessage(o: OrderMsgInput) {
  const fmt = (n: number) => n.toLocaleString("ar-EG");
  const lines = [
    "🏥 *صيدلية المصلي*",
    "━━━━━━━━━━━━━━━",
    "🛒 *طلب جديد*",
    `🆔 رقم الطلب: *${o.orderId}*`,
    `📅 التاريخ: ${nowAr()}`,
    "",
    "📦 *المنتجات المطلوبة:*",
    ...o.items.map((it, i) => `  ${i + 1}. ${it.name}\n      الكمية: ${it.qty} × ${fmt(it.price)} = *${fmt(it.price * it.qty)} ر.ي*`),
    "",
    "━━━━━━━━━━━━━━━",
    `💰 *الإجمالي: ${fmt(o.total)} ر.ي*`,
    "━━━━━━━━━━━━━━━",
    "",
    "👤 *بيانات العميل:*",
    `   • الاسم: ${o.customer.name}`,
    `   • الجوال: ${o.customer.phone}`,
    `📍 العنوان: ${o.customer.address}`,
    o.customer.notes ? `📝 ملاحظات: ${o.customer.notes}` : "",
    "",
    `🔎 تتبع الطلب: ${trackUrl(o.orderId)}`,
    "",
    "شكراً لثقتكم في *صيدلية المصلي* 🌿",
  ];
  return lines.filter(Boolean).join("\n");
}

export type RxMsgInput = {
  refId: string;
  imageUrls: string[];
  customer: { name: string; phone: string; address: string; notes?: string };
};

export function buildPrescriptionMessage(r: RxMsgInput) {
  const lines = [
    "🏥 *صيدلية المصلي*",
    "━━━━━━━━━━━━━━━",
    "📄 *طلب روشتة جديد*",
    `🆔 الرقم المرجعي: *${r.refId}*`,
    `📅 ${nowAr()}`,
    "",
    "👤 *بيانات العميل:*",
    `   • الاسم: ${r.customer.name}`,
    `   • الجوال: ${r.customer.phone}`,
    `📍 العنوان: ${r.customer.address}`,
    r.customer.notes ? `📝 ملاحظات: ${r.customer.notes}` : "",
    "",
    `🖼️ *صور الروشتة (${r.imageUrls.length}):*`,
    ...r.imageUrls.map((u, i) => `   ${i + 1}. ${u}`),
    "",
    "نرجو تجهيز الأدوية والتواصل لتأكيد الطلب 💊",
  ];
  return lines.filter(Boolean).join("\n");
}

const TOPIC_LABEL: Record<string, string> = {
  interactions: "استشارة تفاعل دوائي",
  symptoms: "فحص أعراض أولي",
  supplement: "توصية مكملات",
  services: "استفسار عن الخدمات",
};

export type AiHandoffInput = {
  topic: "interactions" | "symptoms" | "supplement" | "services";
  messages: { role: "user" | "assistant"; content: string }[];
  recommendedProducts?: { name: string; price?: number }[];
};

export function buildAiHandoffMessage(h: AiHandoffInput) {
  const fmt = (n: number) => n.toLocaleString("ar-EG");
  const recent = h.messages.slice(-6); // keep transcript short
  const lines = [
    "🏥 *صيدلية المصلي*",
    "━━━━━━━━━━━━━━━",
    `🤖 *${TOPIC_LABEL[h.topic] ?? "استشارة"}*`,
    `📅 ${nowAr()}`,
    "",
    "💬 *ملخص المحادثة:*",
    ...recent.map((m) => `${m.role === "user" ? "👤" : "💊"} ${m.content.replace(/\n/g, " ")}`),
    "",
  ];
  if (h.recommendedProducts?.length) {
    lines.push("🛒 *منتجات مقترحة:*");
    h.recommendedProducts.forEach((p, i) => {
      lines.push(`  ${i + 1}. ${p.name}${p.price ? ` — ${fmt(p.price)} ر.ي` : ""}`);
    });
    lines.push("");
  }
  lines.push("أرغب بمتابعة الاستشارة مع صيدلي مختص 🙏");
  return lines.filter(Boolean).join("\n");
}
