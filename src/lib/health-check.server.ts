// Centralized health-check probes used by /api/public/health.* routes.
// Server-only: imports supabaseAdmin and AI gateway. Never import from client code.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateText } from "ai";
import { cacheGet, cacheSet, cacheDelete } from "@/lib/cache.server";

export type CheckStatus = "pass" | "fail" | "warn";

export interface CheckResult {
  status: CheckStatus;
  message: string;
  details?: unknown;
  duration: number;
}

export interface HealthReport {
  timestamp: string;
  status: "healthy" | "degraded" | "unhealthy";
  duration: number;
  checks: Record<string, CheckResult>;
  summary: { passed: number; failed: number; warnings: number; total: number };
}

async function timed(fn: () => Promise<CheckResult>): Promise<CheckResult> {
  const t = Date.now();
  try {
    const r = await fn();
    return { ...r, duration: r.duration ?? Date.now() - t };
  } catch (e) {
    return {
      status: "fail",
      message: e instanceof Error ? e.message : String(e),
      duration: Date.now() - t,
    };
  }
}

// 1) Database connectivity + core tables present
async function checkDatabase(): Promise<CheckResult> {
  return timed(async () => {
    const start = Date.now();
    const tables = [
      "products",
      "orders",
      "whatsapp_conversations",
      "notifications",
      "loyalty_accounts",
      "prescriptions",
    ] as const;
    const missing: string[] = [];
    for (const t of tables) {
      const { error } = await supabaseAdmin.from(t).select("*", { head: true, count: "exact" }).limit(1);
      if (error && (error.code === "42P01" || /does not exist/i.test(error.message))) missing.push(t);
    }
    if (missing.length) {
      return {
        status: "warn",
        message: `جداول مفقودة: ${missing.join(", ")}`,
        details: { missing },
        duration: Date.now() - start,
      };
    }
    return {
      status: "pass",
      message: "قاعدة البيانات تعمل بشكل طبيعي",
      details: { tables: tables.length },
      duration: Date.now() - start,
    };
  });
}

// 2) Lovable AI gateway reachable
async function checkAI(): Promise<CheckResult> {
  return timed(async () => {
    const start = Date.now();
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return { status: "warn", message: "LOVABLE_API_KEY غير مضبوط", duration: Date.now() - start };
    }
    const provider = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: provider("google/gemini-2.5-flash-lite"),
      prompt: "ping",
    });
    return {
      status: text?.trim() ? "pass" : "warn",
      message: text?.trim() ? "الذكاء الاصطناعي يعمل" : "استجابة فارغة",
      details: { sample: (text || "").slice(0, 40) },
      duration: Date.now() - start,
    };
  });
}

// 3) Notifications table reachable
async function checkNotifications(): Promise<CheckResult> {
  return timed(async () => {
    const start = Date.now();
    const { error } = await supabaseAdmin.from("notifications").select("id").limit(1);
    if (error) return { status: "fail", message: error.message, duration: Date.now() - start };
    return { status: "pass", message: "نظام الإشعارات يعمل", duration: Date.now() - start };
  });
}

// 4) Loyalty table reachable
async function checkLoyalty(): Promise<CheckResult> {
  return timed(async () => {
    const start = Date.now();
    const { error } = await supabaseAdmin.from("loyalty_accounts").select("id").limit(1);
    if (error) return { status: "fail", message: error.message, duration: Date.now() - start };
    return { status: "pass", message: "نظام الولاء يعمل", duration: Date.now() - start };
  });
}

// 5) In-memory cache round-trip
async function checkCache(): Promise<CheckResult> {
  return timed(async () => {
    const start = Date.now();
    const k = "__health_probe__";
    cacheSet(k, { ok: true }, 5);
    const got = cacheGet<{ ok: boolean }>(k);
    cacheDelete(k);
    return got?.ok
      ? { status: "pass", message: "الكاش يعمل", duration: Date.now() - start }
      : { status: "warn", message: "تعذّر استرجاع قيمة الكاش", duration: Date.now() - start };
  });
}

// 6) WhatsApp tables reachable + recent activity
async function checkWhatsApp(): Promise<CheckResult> {
  return timed(async () => {
    const start = Date.now();
    const { error } = await supabaseAdmin.from("whatsapp_conversations").select("id").limit(1);
    if (error) return { status: "fail", message: error.message, duration: Date.now() - start };
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("id", { head: true, count: "exact" })
      .gt("created_at", since);
    return {
      status: "pass",
      message: "خدمة واتساب تعمل",
      details: { messagesLast7d: count ?? 0 },
      duration: Date.now() - start,
    };
  });
}

// 7) Required env vars
async function checkEnv(): Promise<CheckResult> {
  return timed(async () => {
    const start = Date.now();
    const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_PUBLISHABLE_KEY", "LOVABLE_API_KEY"];
    const optional = ["WHATSAPP_CLOUD_API_TOKEN", "RESEND_API_KEY", "SENTRY_DSN"];
    const missing = required.filter((k) => !process.env[k]);
    const presentOptional = optional.filter((k) => process.env[k]).length;
    return missing.length
      ? {
          status: "fail",
          message: `متغيرات مطلوبة مفقودة: ${missing.join(", ")}`,
          details: { missing },
          duration: Date.now() - start,
        }
      : {
          status: "pass",
          message: "متغيرات البيئة مضبوطة",
          details: { optionalPresent: `${presentOptional}/${optional.length}` },
          duration: Date.now() - start,
        };
  });
}

// 8) Inventory (products + branches)
async function checkInventory(): Promise<CheckResult> {
  return timed(async () => {
    const start = Date.now();
    const { error: pe } = await supabaseAdmin.from("products").select("id").limit(1);
    if (pe) return { status: "fail", message: pe.message, duration: Date.now() - start };
    const { error: be } = await supabaseAdmin.from("branches").select("id").limit(1);
    return {
      status: "pass",
      message: "نظام المخزون يعمل",
      details: { multiBranch: !be },
      duration: Date.now() - start,
    };
  });
}

// 9) Prescriptions
async function checkPrescription(): Promise<CheckResult> {
  return timed(async () => {
    const start = Date.now();
    const { error } = await supabaseAdmin.from("prescriptions").select("id").limit(1);
    return error
      ? { status: "warn", message: error.message, duration: Date.now() - start }
      : { status: "pass", message: "نظام الوصفات يعمل", duration: Date.now() - start };
  });
}

function summarize(checks: Record<string, CheckResult>, start: number): HealthReport {
  const results = Object.values(checks);
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const warnings = results.filter((r) => r.status === "warn").length;
  return {
    timestamp: new Date().toISOString(),
    status: failed ? "unhealthy" : warnings ? "degraded" : "healthy",
    duration: Date.now() - start,
    checks,
    summary: { passed, failed, warnings, total: results.length },
  };
}

export async function runFullHealthCheck(): Promise<HealthReport> {
  const start = Date.now();
  const [database, ai, loyalty, notifications, cache, whatsapp, env, inventory, prescription] = await Promise.all([
    checkDatabase(),
    checkAI(),
    checkLoyalty(),
    checkNotifications(),
    checkCache(),
    checkWhatsApp(),
    checkEnv(),
    checkInventory(),
    checkPrescription(),
  ]);
  return summarize({ database, ai, loyalty, notifications, cache, whatsapp, env, inventory, prescription }, start);
}

export async function runQuickHealthCheck(): Promise<HealthReport> {
  const start = Date.now();
  const [database, env, whatsapp] = await Promise.all([checkDatabase(), checkEnv(), checkWhatsApp()]);
  return summarize({ database, env, whatsapp }, start);
}
