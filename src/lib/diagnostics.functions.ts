// Comprehensive diagnostics for the social-publishing stack.
// Tests: env vars, DeepSeek key, n8n webhook reachability, Supabase admin
// access, products table read, RLS (caller's user view vs admin view).
// Admin-only.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CheckStatus = "pass" | "fail" | "warn" | "skip";

interface Check {
  id: string;
  label: string;
  status: CheckStatus;
  message: string;
  detail?: unknown;
  durationMs?: number;
}

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "owner"])
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("صلاحيات الأدمن مطلوبة");
}

async function timed<T>(fn: () => Promise<T>): Promise<[T | Error, number]> {
  const t0 = Date.now();
  try {
    const r = await fn();
    return [r, Date.now() - t0];
  } catch (e) {
    return [e as Error, Date.now() - t0];
  }
}

export const runFullDiagnostics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    const checks: Check[] = [];

    // ── 1) Environment variables ─────────────────────────────
    const envs = {
      N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
      N8N_CALLBACK_SECRET: process.env.N8N_CALLBACK_SECRET,
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      CRON_SECRET: process.env.CRON_SECRET,
    };
    for (const [k, v] of Object.entries(envs)) {
      checks.push({
        id: `env.${k}`,
        label: `متغير البيئة ${k}`,
        status: v ? "pass" : k === "CRON_SECRET" ? "warn" : "fail",
        message: v
          ? `موجود (${String(v).length} حرف${k.includes("URL") ? `، يبدأ بـ ${String(v).slice(0, 30)}…` : ""})`
          : "غير مضبوط",
      });
    }

    // ── 2) DeepSeek key validity (low-cost models call) ──────
    if (envs.DEEPSEEK_API_KEY) {
      const [r, ms] = await timed(async () => {
        const res = await fetch("https://api.deepseek.com/v1/models", {
          headers: { Authorization: `Bearer ${envs.DEEPSEEK_API_KEY}` },
        });
        return { ok: res.ok, status: res.status, body: (await res.text()).slice(0, 400) };
      });
      if (r instanceof Error) {
        checks.push({ id: "deepseek.reach", label: "اتصال DeepSeek", status: "fail", message: r.message, durationMs: ms });
      } else {
        checks.push({
          id: "deepseek.reach",
          label: "اتصال DeepSeek (GET /models)",
          status: r.ok ? "pass" : "fail",
          message: r.ok ? `HTTP ${r.status} — المفتاح صالح` : `HTTP ${r.status}: ${r.body.slice(0, 200)}`,
          durationMs: ms,
          detail: r.ok ? undefined : r.body,
        });
      }
    } else {
      checks.push({ id: "deepseek.reach", label: "اتصال DeepSeek", status: "skip", message: "تم التخطي — المفتاح غير مضبوط" });
    }

    // ── 3) n8n webhook ping ──────────────────────────────────
    if (envs.N8N_WEBHOOK_URL) {
      const { createHmac } = await import("crypto");
      const payload = { event: "ping", post_id: "diag-ping", platform: "telegram", caption: "diagnostics" };
      const raw = JSON.stringify(payload);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (envs.N8N_CALLBACK_SECRET) {
        headers["x-lovable-signature"] = `sha256=${createHmac("sha256", envs.N8N_CALLBACK_SECRET).update(raw).digest("hex")}`;
      }
      const [r, ms] = await timed(async () => {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 12_000);
        try {
          const res = await fetch(envs.N8N_WEBHOOK_URL!, {
            method: "POST",
            headers,
            body: raw,
            signal: controller.signal,
          });
          return { ok: res.ok, status: res.status, body: (await res.text()).slice(0, 500) };
        } finally {
          clearTimeout(t);
        }
      });
      if (r instanceof Error) {
        checks.push({ id: "n8n.ping", label: "n8n webhook ping", status: "fail", message: r.message, durationMs: ms });
      } else {
        checks.push({
          id: "n8n.ping",
          label: "n8n webhook ping",
          status: r.ok ? "pass" : "fail",
          message: r.ok ? `HTTP ${r.status} — الـ Workflow نشط` : `HTTP ${r.status} — تحقق من أن Workflow مفعّل`,
          durationMs: ms,
          detail: r.body,
        });
      }
    } else {
      checks.push({ id: "n8n.ping", label: "n8n webhook ping", status: "skip", message: "تم التخطي — N8N_WEBHOOK_URL غير مضبوط" });
    }

    // ── 4) Supabase admin: products table read ───────────────
    const [productsRes, productsMs] = await timed(async () => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error, count } = await supabaseAdmin
        .from("products")
        .select("id,name", { count: "exact", head: false })
        .limit(1);
      if (error) throw new Error(error.message);
      return { count: count ?? 0, sample: data?.[0] ?? null };
    });
    if (productsRes instanceof Error) {
      checks.push({
        id: "supabase.products",
        label: "قراءة جدول products (admin)",
        status: "fail",
        message: productsRes.message,
        durationMs: productsMs,
      });
    } else {
      checks.push({
        id: "supabase.products",
        label: "قراءة جدول products (admin)",
        status: productsRes.count > 0 ? "pass" : "warn",
        message: productsRes.count > 0
          ? `موجود ${productsRes.count} منتج — مثال: ${productsRes.sample?.name ?? "-"}`
          : "الجدول فارغ",
        durationMs: productsMs,
      });
    }

    // ── 5) Required tables exist ─────────────────────────────
    const requiredTables = ["social_posts", "social_post_attempts", "social_post_stats", "user_roles"];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (const t of requiredTables) {
      const { error } = await supabaseAdmin.from(t).select("*", { head: true, count: "exact" }).limit(1);
      checks.push({
        id: `supabase.table.${t}`,
        label: `جدول ${t}`,
        status: error ? "fail" : "pass",
        message: error ? error.message : "موجود ويمكن الوصول",
      });
    }

    // ── 6) RLS sanity: caller (admin) reads social_posts ─────
    const [callerRes, callerMs] = await timed(async () => {
      const { count, error } = await context.supabase
        .from("social_posts")
        .select("*", { count: "exact", head: true });
      if (error) throw new Error(error.message);
      return count ?? 0;
    });
    if (callerRes instanceof Error) {
      checks.push({
        id: "rls.caller",
        label: "RLS — المسؤول يقرأ social_posts",
        status: "fail",
        message: callerRes.message,
        durationMs: callerMs,
      });
    } else {
      checks.push({
        id: "rls.caller",
        label: "RLS — المسؤول يقرأ social_posts",
        status: "pass",
        message: `قرأ ${callerRes} صف عبر RLS — السياسات تعمل`,
        durationMs: callerMs,
      });
    }

    // ── 7) Anonymous client should NOT read social_posts ─────
    const [anonRes, anonMs] = await timed(async () => {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await client.from("social_posts").select("id").limit(1);
      return { rows: data?.length ?? 0, error: error?.message ?? null };
    });
    if (anonRes instanceof Error) {
      checks.push({
        id: "rls.anon",
        label: "RLS — المجهول محجوب عن social_posts",
        status: "pass",
        message: `رُفض كما هو متوقع: ${anonRes.message}`,
        durationMs: anonMs,
      });
    } else {
      checks.push({
        id: "rls.anon",
        label: "RLS — المجهول محجوب عن social_posts",
        status: anonRes.rows === 0 ? "pass" : "fail",
        message:
          anonRes.rows === 0
            ? "لم يقرأ أي صف — السياسات سليمة"
            : `⚠️ خطر: المجهول قرأ ${anonRes.rows} صف — راجع RLS`,
        durationMs: anonMs,
        detail: anonRes.error,
      });
    }

    const summary = {
      pass: checks.filter((c) => c.status === "pass").length,
      fail: checks.filter((c) => c.status === "fail").length,
      warn: checks.filter((c) => c.status === "warn").length,
      skip: checks.filter((c) => c.status === "skip").length,
    };

    return { checks, summary, ranAt: new Date().toISOString() };
  });
