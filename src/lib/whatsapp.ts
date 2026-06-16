export const WHATSAPP_NUMBER = "967782878280";

export function waLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(message: string) {
  if (typeof window === "undefined") return;
  window.open(waLink(message), "_blank", "noopener,noreferrer");
}
