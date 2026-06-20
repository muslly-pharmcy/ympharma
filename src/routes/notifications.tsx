// Phase 6C Sprint 3 — Customer-facing opt-in / opt-out page.
//
// Accessed via tokenized link in WhatsApp notifications:
//   /notifications?t=<opt_out_token>
// No login required: the token in the URL is the bearer.

import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  getCustomerNotificationStatus,
  setCustomerNotificationOptOut,
} from "@/lib/customer-notifications.functions";

const searchSchema = z.object({ t: z.string().optional().default("") });

export const Route = createFileRoute("/notifications")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "إعدادات إشعارات واتساب — صيدلية المصلي" },
      { name: "robots", content: "noindex,nofollow" },
      {
        name: "description",
        content: "تحكم في تلقي إشعارات واتساب الخاصة بحالة وصفاتك الطبية.",
      },
    ],
  }),
  component: NotificationsPreferencesPage,
});

function NotificationsPreferencesPage() {
  const { t: token } = Route.useSearch();
  const qc = useQueryClient();
  const getStatus = useServerFn(getCustomerNotificationStatus);
  const setOptOut = useServerFn(setCustomerNotificationOptOut);

  const status = useQuery({
    queryKey: ["customer-notif-status", token],
    queryFn: () => getStatus({ data: { token } }),
    enabled: token.length >= 8,
    retry: false,
    staleTime: 30_000,
  });

  const mutate = useMutation({
    mutationFn: (optOut: boolean) => setOptOut({ data: { token, optOut } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-notif-status", token] }),
  });

  if (!token) {
    return (
      <Shell>
        <Card tone="error">
          <h2 className="mb-2 text-lg font-black">رابط غير صالح</h2>
          <p>
            الرجاء فتح الرابط المرسل في رسالة واتساب الخاصة بك. لا يمكن الوصول إلى هذه الصفحة
            بدون رمز مميز.
          </p>
        </Card>
      </Shell>
    );
  }

  if (status.isLoading) {
    return (
      <Shell>
        <Card>جارٍ التحقق من الرابط…</Card>
      </Shell>
    );
  }

  if (status.isError || !status.data?.ok) {
    return (
      <Shell>
        <Card tone="error">
          <h2 className="mb-2 text-lg font-black">رابط منتهي أو غير صحيح</h2>
          <p>
            لم نتمكن من العثور على إعدادات الإشعارات الخاصة بك. إذا كنت تواجه مشكلة، تواصل
            مع الصيدلية مباشرة.
          </p>
        </Card>
      </Shell>
    );
  }

  const optedOut = status.data.whatsapp_enabled === false;
  const suffix = status.data.phone_suffix ?? "—";

  return (
    <Shell>
      <Card>
        <h1 className="mb-1 text-2xl font-black text-primary-deep">إعدادات إشعارات واتساب</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          الرقم المسجل: <span dir="ltr">•••• {suffix}</span>
        </p>

        <div
          className={`mb-6 rounded-2xl border-2 p-5 transition ${
            optedOut
              ? "border-rose-200 bg-rose-50"
              : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-bold">
                {optedOut ? "إشعارات واتساب موقوفة" : "إشعارات واتساب مفعّلة"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {optedOut
                  ? "لن نرسل لك أي رسائل بخصوص الوصفات الطبية حتى تعيد تفعيلها."
                  : "ستصلك رسالة عند تغيّر حالة وصفتك (اعتماد، رفض، تصعيد للصيدلي)."}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${
                optedOut ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {optedOut ? "موقوفة" : "مفعّلة"}
            </span>
          </div>
        </div>

        <button
          onClick={() => mutate.mutate(!optedOut)}
          disabled={mutate.isPending}
          className={`w-full rounded-xl px-4 py-3 text-sm font-black transition disabled:opacity-50 ${
            optedOut
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-rose-600 text-white hover:bg-rose-700"
          }`}
        >
          {mutate.isPending
            ? "جارٍ الحفظ…"
            : optedOut
              ? "✅ إعادة تفعيل الإشعارات"
              : "🔕 إلغاء الاشتراك من الإشعارات"}
        </button>

        {mutate.isError && (
          <p className="mt-3 text-sm text-rose-700">
            تعذّر حفظ التغيير: {(mutate.error as Error).message}
          </p>
        )}

        <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
          تنطبق هذه الإعدادات على كل الإشعارات المتعلقة بالوصفات المرسلة إلى الرقم المسجّل.
          يمكنك تغييرها في أي وقت من خلال نفس الرابط.
        </p>
      </Card>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <main className="mx-auto flex max-w-xl items-start justify-center px-4 py-12">
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}

function Card({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "error";
}) {
  return (
    <div
      className={`rounded-3xl border bg-card p-6 shadow-card ${
        tone === "error" ? "border-rose-200" : "border-border"
      }`}
    >
      {children}
    </div>
  );
}
