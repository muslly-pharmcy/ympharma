export type Order = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  notes: string | null;
  total: number;
  status: string;
  items: { id: number; qty: number; name: string; price: number }[];
  created_at: string;
};

export type Rx = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  notes: string | null;
  image_urls: string[];
  status: string;
  created_at: string;
};

export const STATUSES: { v: string; label: string; color: string }[] = [
  { v: "pending", label: "قيد المراجعة", color: "bg-amber-100 text-amber-700" },
  { v: "confirmed", label: "تم التأكيد", color: "bg-blue-100 text-blue-700" },
  { v: "shipped", label: "في الطريق", color: "bg-purple-100 text-purple-700" },
  { v: "delivered", label: "تم التسليم", color: "bg-emerald-100 text-emerald-700" },
  { v: "cancelled", label: "ملغي", color: "bg-rose-100 text-rose-700" },
  { v: "archived", label: "مؤرشف", color: "bg-slate-200 text-slate-700" },
];

export function statusBadge(s: string) {
  return STATUSES.find((x) => x.v === s) ?? { v: s, label: s, color: "bg-secondary text-foreground" };
}

export function applyChange<T extends { id: string }>(cur: T[], payload: { eventType: string; new: any; old: any }): T[] {
  if (payload.eventType === "INSERT") {
    if (cur.some((x) => x.id === payload.new.id)) return cur;
    return [payload.new as T, ...cur];
  }
  if (payload.eventType === "UPDATE") {
    return cur.map((x) => (x.id === payload.new.id ? (payload.new as T) : x));
  }
  if (payload.eventType === "DELETE") {
    return cur.filter((x) => x.id !== payload.old.id);
  }
  return cur;
}

export function Empty({ text }: { text: string }) {
  return <div className="rounded-3xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">{text}</div>;
}
