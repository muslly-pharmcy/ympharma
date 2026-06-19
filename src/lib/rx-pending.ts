// Fault-tolerant prescription draft & pending-queue helpers.
// Goal: NO prescription is ever lost — even if the DB insert fails, the
// network drops mid-submit, or the user closes the tab before WhatsApp opens.
//
// Strategy:
// 1) Draft (form + uploaded URLs) is persisted to localStorage on every change.
// 2) After uploads succeed but BEFORE the DB insert returns OK, we save a
//    "pending commit" entry. If the insert fails (network/RLS/etc) the entry
//    survives and we retry on next page load.
// 3) After the DB insert succeeds we mark the entry as "awaiting-whatsapp" so
//    if WhatsApp didn't open we can re-open it from the recovery banner.
// 4) Only after the user confirms (or a successful WhatsApp open + 1 minute)
//    do we clear the entry.

import { supabase } from "@/integrations/supabase/client";

const DRAFT_KEY = "rx:draft:v1";
const PENDING_KEY = "rx:pending:v1";

export type RxDraft = {
  name: string;
  phone: string;
  address: string;
  notes: string;
  updatedAt: number;
};

export type RxPending = {
  refId: string;
  customer: { name: string; phone: string; address: string; notes?: string };
  imageUrls: string[];
  stage: "committing" | "awaiting-whatsapp";
  createdAt: number;
  lastError?: string;
  attempts: number;
};

function safeGet<T>(key: string): T | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}
function safeSet(key: string, value: unknown) {
  try { if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}
function safeDel(key: string) {
  try { if (typeof localStorage !== "undefined") localStorage.removeItem(key); } catch { /* noop */ }
}

export function loadDraft(): RxDraft | null { return safeGet<RxDraft>(DRAFT_KEY); }
export function saveDraft(d: Omit<RxDraft, "updatedAt">) {
  safeSet(DRAFT_KEY, { ...d, updatedAt: Date.now() });
}
export function clearDraft() { safeDel(DRAFT_KEY); }

export function loadPending(): RxPending | null { return safeGet<RxPending>(PENDING_KEY); }
export function savePending(p: RxPending) { safeSet(PENDING_KEY, p); }
export function clearPending() { safeDel(PENDING_KEY); }

/** Verify a freshly uploaded file is actually reachable on the storage CDN. */
export async function verifyUploaded(signedUrl: string, timeoutMs = 10_000): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(signedUrl, { method: "HEAD", signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    return res.ok;
  } catch { return false; }
}

/** Server-authoritative commit via `submit_prescription` SECURITY DEFINER
 * RPC. The RPC validates the payload (lengths, image-URL origin) and is
 * idempotent on `id` so safe to retry. */
export async function commitPending(p: RxPending): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { data, error } = await supabase.rpc("submit_prescription" as never, {
      _id: p.refId,
      _customer: {
        name: p.customer.name,
        phone: p.customer.phone,
        address: p.customer.address,
        notes: p.customer.notes ?? null,
      },
      _image_urls: p.imageUrls,
    } as never);
    if (error) return { ok: false, error: error.message };
    const result = data as { ok?: boolean } | null;
    if (!result || result.ok !== true) return { ok: false, error: "server_rejected" };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "network" };
  }
}
