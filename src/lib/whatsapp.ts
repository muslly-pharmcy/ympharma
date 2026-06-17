export const WHATSAPP_NUMBER = "967782878280";

/** Normalize a Yemeni phone to international form (no +). */
export function normalizePhone(raw: string): string {
  const digits = (raw || "").replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("967")) return digits;
  if (digits.startsWith("0")) return "967" + digits.slice(1);
  if (digits.length === 9) return "967" + digits;
  return digits;
}

export function waLink(message: string, phone?: string) {
  const num = phone ? normalizePhone(phone) : WHATSAPP_NUMBER;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(message: string, phone?: string) {
  if (typeof window === "undefined") return;
  const url = waLink(message, phone);
  const popup = window.open(url, "_blank", "noopener,noreferrer");
  if (!popup) window.location.href = url;
}

/** Build a localized status-change message to send to the customer. */
export function buildStatusMessage(opts: { name: string; orderId: string; status: string }): string {
  const { name, orderId, status } = opts;
  const trackUrl = typeof window !== "undefined" ? `${window.location.origin}/track?id=${orderId}` : `/track?id=${orderId}`;
  const head = `🏥 *صيدلية المصلي*\n👋 مرحبًا ${name}،`;
  const tail = `\n\n🔎 تتبع طلبك: ${trackUrl}\nشكراً لثقتكم 🌿`;
  switch (status) {
    case "confirmed":
      return `${head}\n✅ تم *تأكيد* طلبك رقم *${orderId}* ونبدأ الآن في تجهيزه.${tail}`;
    case "shipped":
      return `${head}\n🚚 طلبك رقم *${orderId}* أصبح *في الطريق* إليك الآن.${tail}`;
    case "delivered":
      return `${head}\n📦 تم *تسليم* طلبك رقم *${orderId}* بنجاح. نتمنى لكم دوام الصحة والعافية.${tail}`;
    case "cancelled":
      return `${head}\n⚠️ نأسف لإبلاغك بأن طلبك رقم *${orderId}* قد *أُلغي*. للاستفسار يرجى التواصل معنا.${tail}`;
    default:
      return `${head}\nبخصوص طلبك رقم *${orderId}*.${tail}`;
  }
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
