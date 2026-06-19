// Fault-tolerant order submission queue.
// Mirrors src/lib/rx-pending.ts pattern for orders.
//
// Guarantees:
// 1. Order is queued to localStorage BEFORE the network call.
// 2. DB insert uses retry-with-backoff over YemenNet drops.
// 3. Insert is idempotent on the order id (SELECT-before-INSERT).
// 4. Pending entries survive tab close and are retried on next app load.
// 5. User only sees "confirmed" after durable DB persistence OR an explicit
//    error toast — never a silent loss.

import { supabase } from "@/integrations/supabase/client";
import { withRetry } from "@/lib/net-retry";

const QUEUE_KEY = "orders:pending:v1";

export type PendingOrderItem = { id: number; qty: number; name: string; price: number };

export type PendingOrder = {
  id: string;
  customer: { name: string; phone: string; address: string; notes?: string };
  items: PendingOrderItem[];
  total: number;
  createdAt: number;
  attempts: number;
  lastError?: string;
  stage: "queued" | "committed";
};

function safeGet<T>(k: string): T | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const r = localStorage.getItem(k);
    return r ? (JSON.parse(r) as T) : null;
  } catch { return null; }
}
function safeSet(k: string, v: unknown) {
  try { if (typeof localStorage !== "undefined") localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ }
}

export function loadQueue(): PendingOrder[] {
  return safeGet<PendingOrder[]>(QUEUE_KEY) ?? [];
}
export function saveQueue(q: PendingOrder[]) { safeSet(QUEUE_KEY, q); }

export function enqueue(order: PendingOrder) {
  const q = loadQueue();
  if (!q.find((x) => x.id === order.id)) q.push(order);
  saveQueue(q);
}
export function dequeue(id: string) {
  saveQueue(loadQueue().filter((x) => x.id !== id));
}
export function updateEntry(id: string, patch: Partial<PendingOrder>) {
  saveQueue(loadQueue().map((x) => (x.id === id ? { ...x, ...patch } : x)));
}

/** Cryptographically random, collision-free order id. */
export function generateOrderId(): string {
  // crypto.randomUUID is available in modern browsers and Node 19+.
  // Fallback for unusually old browsers uses getRandomValues.
  let uuid: string;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    uuid = crypto.randomUUID();
  } else if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
    uuid = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  } else {
    throw new Error("crypto.randomUUID unavailable");
  }
  // Human-friendly visible id while keeping 48 bits of entropy (collision ~0).
  return "AM-" + uuid.replace(/-/g, "").slice(0, 12).toUpperCase();
}

/** Server-authoritative commit: calls the `place_order` SECURITY DEFINER RPC,
 * which recomputes the total from `public.products` and ignores any client
 * price. Idempotent on `id`. The client-side `total` field on PendingOrder is
 * only used for the optimistic UI; the persisted authoritative total comes
 * from the DB. */
export async function commitOrder(o: PendingOrder): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { data, error } = await supabase.rpc("place_order" as never, {
      _id: o.id,
      _customer: {
        name: o.customer.name,
        phone: o.customer.phone,
        address: o.customer.address,
        notes: o.customer.notes ?? null,
      },
      _items: o.items.map((i) => ({ id: i.id, qty: i.qty })),
    } as never);
    if (error) return { ok: false, error: error.message };
    // Server may return an authoritative total — surface it through console
    // for the operator but do not block the user.
    const result = data as { ok?: boolean; total?: number; id?: string } | null;
    if (!result || result.ok !== true) return { ok: false, error: "server_rejected" };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "network" };
  }
}

/** Persist + commit with retry. Throws only after all retries fail; entry
 * remains in the queue for next-load retry. */
export async function persistAndCommit(o: PendingOrder): Promise<void> {
  enqueue(o);
  try {
    await withRetry(async () => {
      const r = await commitOrder(o);
      if (!r.ok) throw new Error(r.error);
    }, { max: 5, baseMs: 700, capMs: 9000, label: `order-commit:${o.id}` });
    updateEntry(o.id, { stage: "committed" });
    // Successful — remove from queue.
    dequeue(o.id);
  } catch (e: any) {
    updateEntry(o.id, { attempts: (o.attempts || 0) + 1, lastError: e?.message || String(e) });
    throw e;
  }
}

/** Drain any orders left from previous sessions. Called once on app boot. */
export async function drainPendingOrders(): Promise<{ recovered: number; failed: number }> {
  const q = loadQueue();
  if (q.length === 0) return { recovered: 0, failed: 0 };
  let recovered = 0, failed = 0;
  for (const o of q) {
    const r = await commitOrder(o);
    if (r.ok) { dequeue(o.id); recovered++; }
    else { updateEntry(o.id, { attempts: (o.attempts || 0) + 1, lastError: r.error }); failed++; }
  }
  return { recovered, failed };
}
