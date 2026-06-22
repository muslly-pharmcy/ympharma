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

async function timed(fn: () => Promise<Omit<CheckResult, "duration">>): Promise<CheckResult> {
  const start = Date.now();
  try {
    const r = await fn();
    return { ...r, duration: Date.now() - start };
  } catch (e) {
    return {
      status: "fail",
      message: e instanceof Error ? e.message : String(e),
      duration: Date.now() - start,
    };
  }
}

// 1) Database connectivity + core tables present
async function checkDatabase(): Promise<CheckResult> {
  return timed(async () => {
    const tables = [
      "products",
      "orders",
      "whatsapp_conversations",
      "whatsapp_messages",
      "notifications",
      "loyalty_accounts",
      "loyalty_transactions",
      "prescriptions",
      "agent_approval_requests",
      "branches",
      "branch_inventory",
    ] as const;
    const missing: string[] = [];
    const accessible: string[] = [];
    for (const t of tables) {
      const { error } = await supabaseAdmin.from(t).select("*", { head: true, count: "exact" }).limit(1);
      if (error && (error.code === "42P01" || /does not exist/i.test(error.message))) missing.push(t);
      else if (!error) accessible.push(t);
    }
    if (missing.length) {
      return {
        status: "warn",
        message: `جداول مفقودة: ${missing.join(", ")}`,
        details: { missing, accessible: accessible.length },
      };
    }
    return {
      status: "pass",
      message: "✅ قاعدة البيانات تعمل بشكل طبيعي",
      details: { totalTables: tables.length, accessible: accessible.length },
    };
  });
}

// 2) Lovable AI gateway reachable
async function checkAI(): Promise<CheckResult> {
  return timed(async () => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return { status: "warn", message: "⚠️ LOVABLE_API_KEY غير مضبوط" };
    }
    const provider = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: provider("google/gemini-2.5-flash"),
      prompt: "ping",
    });
    return text?.trim()
      ? {
          status: "pass",
          message: "✅ الذكاء الاصطناعي يعمل (Gemini)",
          details: { sample: text.trim().slice(0, 40), model: "google/gemini-2.5-flash" },
        }
      : { status: "warn", message: "⚠️ استجابة الذكاء الاصطناعي فارغة" };
  });
}

// 3) WhatsApp bot: conversations + recent messages + pending approvals
async function checkWhatsApp(): Promise<CheckResult> {
  return timed(async () => {
    const { error: convError, count: conversations } = await supabaseAdmin
      .from("whatsapp_conversations")
      .select("id", { head: true, count: "exact" });
    if (convError) {
      return {
        status: "fail",
        message: `❌ فشل الوصول إلى محادثات واتساب: ${convError.message}`,
      };
    }
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { count: messagesLast7d, error: msgError } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("id", { head: true, count: "exact" })
      .gt("created_at", since);
    if (msgError) {
      return {
        status: "warn",
        message: "⚠️ تعذّر جلب رسائل واتساب الأخيرة",
        details: { error: msgError.message, conversations: conversations ?? 0 },
      };
    }
    const { count: pendingApprovals } = await supabaseAdmin
      .from("agent_approval_requests")
      .select("id", { head: true, count: "exact" })
      .eq("status", "pending");
    return {
      status: "pass",
      message: "✅ بوت واتساب يعمل بشكل طبيعي",
      details: {
        conversations: conversations ?? 0,
        messagesLast7d: messagesLast7d ?? 0,
        pendingApprovals: pendingApprovals ?? 0,
      },
    };
  });
}

// 4) Prescriptions system
async function checkPrescription(): Promise<CheckResult> {
  return timed(async () => {
    const { error, count: total } = await supabaseAdmin
      .from("prescriptions")
      .select("id", { head: true, count: "exact" });
    if (error) {
      return {
        status: "warn",
        message: `⚠️ جدول الوصفات غير متاح: ${error.message}`,
      };
    }
    const { count: pending } = await supabaseAdmin
      .from("prescriptions")
      .select("id", { head: true, count: "exact" })
      .eq("status", "pending");
    const { error: approvalError } = await supabaseAdmin
      .from("agent_approval_requests")
      .select("id")
      .eq("action_type", "prescription")
      .limit(1);
    return {
      status: "pass",
      message: "✅ نظام الوصفات الطبية يعمل",
      details: {
        total: total ?? 0,
        pending: pending ?? 0,
        approvalSystem: !approvalError,
      },
    };
  });
}

// 5) Notifications
async function checkNotifications(): Promise<CheckResult> {
  return timed(async () => {
    const { error, count: total } = await supabaseAdmin
      .from("notifications")
      .select("id", { head: true, count: "exact" });
    if (error) return { status: "fail", message: `❌ ${error.message}` };
    const { count: unread } = await supabaseAdmin
      .from("notifications")
      .select("id", { head: true, count: "exact" })
      .eq("read", false);
    return {
      status: "pass",
      message: "✅ نظام الإشعارات يعمل",
      details: { total: total ?? 0, unread: unread ?? 0 },
    };
  });
}

// 6) Loyalty
async function checkLoyalty(): Promise<CheckResult> {
  return timed(async () => {
    const { error: accError, count: accounts } = await supabaseAdmin
      .from("loyalty_accounts")
      .select("id", { head: true, count: "exact" });
    if (accError) return { status: "fail", message: `❌ ${accError.message}` };
    const { count: transactions } = await supabaseAdmin
      .from("loyalty_transactions")
      .select("id", { head: true, count: "exact" });
    return {
      status: "pass",
      message: "✅ نظام الولاء يعمل",
      details: { accounts: accounts ?? 0, transactions: transactions ?? 0 },
    };
  });
}

// 7) In-memory cache round-trip
async function checkCache(): Promise<CheckResult> {
  return timed(async () => {
    const k = "__health_probe__";
    cacheSet(k, { ok: true }, 5);
    const got = cacheGet<{ ok: boolean }>(k);
    cacheDelete(k);
    return got?.ok
      ? { status: "pass", message: "✅ الكاش يعمل", details: { type: "Memory Cache", ttl: "5s" } }
      : { status: "warn", message: "⚠️ تعذّر استرجاع قيمة الكاش" };
  });
}

// 8) Inventory (products + branches + branch_inventory)
async function checkInventory(): Promise<CheckResult> {
  return timed(async () => {
    const { error: pe, count: products } = await supabaseAdmin
      .from("products")
      .select("id", { head: true, count: "exact" });
    if (pe) return { status: "fail", message: `❌ ${pe.message}` };
    const { error: be, count: branches } = await supabaseAdmin
      .from("branches")
      .select("id", { head: true, count: "exact" });
    const { count: inventoryItems } = await supabaseAdmin
      .from("branch_inventory")
      .select("id", { head: true, count: "exact" });
    return {
      status: "pass",
      message: "✅ نظام المخزون يعمل",
      details: {
        products: products ?? 0,
        branches: branches ?? 0,
        inventoryItems: inventoryItems ?? 0,
        multiBranch: !be,
      },
    };
  });
}

// 9) Required env vars
async function checkEnv(): Promise<CheckResult> {
  return timed(async () => {
    const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_PUBLISHABLE_KEY", "LOVABLE_API_KEY"];
    const optional = [
      "WHATSAPP_CLOUD_API_TOKEN",
      "RESEND_API_KEY",
      "SENTRY_DSN",
      "CRON_SECRET",
      "EXTRACT_WORKER_SECRET",
    ];
    const missing = required.filter((k) => !process.env[k]);
    const presentOptional = optional.filter((k) => process.env[k]).length;
    return missing.length
      ? {
          status: "fail",
          message: `❌ متغيرات مطلوبة مفقودة: ${missing.join(", ")}`,
          details: { missing },
        }
      : {
          status: "pass",
          message: "✅ متغيرات البيئة مضبوطة",
          details: { optionalPresent: `${presentOptional}/${optional.length}` },
        };
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
  const [database, ai, whatsapp, prescription, notifications, loyalty, cache, inventory, env] = await Promise.all([
    checkDatabase(),
    checkAI(),
    checkWhatsApp(),
    checkPrescription(),
    checkNotifications(),
    checkLoyalty(),
    checkCache(),
    checkInventory(),
    checkEnv(),
  ]);
  return summarize(
    { database, ai, whatsapp, prescription, notifications, loyalty, cache, inventory, env },
    start,
  );
}

export async function runQuickHealthCheck(): Promise<HealthReport> {
  const start = Date.now();
  const [database, whatsapp, prescription] = await Promise.all([
    checkDatabase(),
    checkWhatsApp(),
    checkPrescription(),
  ]);
  return summarize({ database, whatsapp, prescription }, start);
}

export async function checkWhatsAppOnly(): Promise<CheckResult> {
  return checkWhatsApp();
}

export async function checkPrescriptionOnly(): Promise<CheckResult> {
  return checkPrescription();
}
