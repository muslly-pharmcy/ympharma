import { CalendarClock, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";

export function AppointmentCTA({ phone, whatsapp, doctorName }: { phone?: string | null; whatsapp?: string | null; doctorName: string }) {
  const waNum = (whatsapp || phone || "").replace(/[^\d]/g, "");
  const waHref = waNum ? `https://wa.me/${waNum}?text=${encodeURIComponent(`مرحباً، أرغب بحجز موعد مع ${doctorName}`)}` : null;
  return (
    <div className="space-y-2">
      <button
        onClick={() => toast.info("حجز المواعيد المباشر قريباً — يمكنك التواصل عبر واتساب حالياً")}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-sm transition hover:opacity-95"
      >
        <CalendarClock className="size-4" /> احجز موعد (قريباً)
      </button>
      <div className="grid grid-cols-2 gap-2">
        {waHref && (
          <a href={waHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            <MessageCircle className="size-3.5" /> واتساب
          </a>
        )}
        {phone && (
          <a href={`tel:${phone}`} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold">
            <Phone className="size-3.5" /> اتصال
          </a>
        )}
      </div>
    </div>
  );
}
