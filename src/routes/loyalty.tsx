import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getMyLoyalty,
  getMyLoyaltyTransactions,
  linkLoyaltyAccountByPhone,
} from "@/lib/loyalty.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Award, Coins, TrendingUp, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/loyalty")({
  head: () => ({
    meta: [
      { title: "نقاط الولاء — صيدلية المصلي" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "رصيد نقاطك ومستواك في برنامج ولاء صيدلية المصلي." },
    ],
  }),
  component: LoyaltyPage,
});

const TIER_LABEL: Record<string, string> = {
  bronze: "برونزي",
  silver: "فضي",
  gold: "ذهبي",
  platinum: "بلاتيني",
};

const TIER_CLASS: Record<string, string> = {
  bronze: "bg-amber-700/10 text-amber-700 border-amber-700/30",
  silver: "bg-slate-400/10 text-slate-600 border-slate-400/30",
  gold: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
  platinum: "bg-indigo-500/10 text-indigo-700 border-indigo-500/30",
};

const TIER_THRESHOLDS = [
  { tier: "silver", min: 10000 },
  { tier: "gold", min: 25000 },
  { tier: "platinum", min: 50000 },
];

function nextTierProgress(spent: number) {
  for (const t of TIER_THRESHOLDS) {
    if (spent < t.min) {
      const prev = TIER_THRESHOLDS.find((x) => x.min < t.min)?.min ?? 0;
      const pct = Math.min(100, Math.max(0, ((spent - prev) / (t.min - prev)) * 100));
      return { nextTier: t.tier, pct, remaining: t.min - spent };
    }
  }
  return null;
}

function LoyaltyPage() {
  const acctFn = useServerFn(getMyLoyalty);
  const txFn = useServerFn(getMyLoyaltyTransactions);

  const acctQ = useQuery({ queryKey: ["my-loyalty"], queryFn: () => acctFn(), retry: false });
  const txQ = useQuery({
    queryKey: ["my-loyalty-tx"],
    queryFn: () => txFn({ data: { limit: 50 } }),
    retry: false,
    enabled: !!acctQ.data?.account,
  });

  if (acctQ.isLoading) {
    return <p className="container mx-auto p-6 text-muted-foreground" dir="rtl">جارٍ التحميل…</p>;
  }
  if (acctQ.isError) {
    return <p className="container mx-auto p-6 text-destructive" dir="rtl">تعذر التحميل. تأكد من تسجيل الدخول.</p>;
  }

  const acct = acctQ.data?.account;

  return (
    <div className="container mx-auto max-w-3xl p-4 md:p-6 space-y-4" dir="rtl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Award className="h-6 w-6" /> برنامج الولاء
      </h1>

      {!acct ? (
        <LinkPhoneCard />
      ) : (
        <>
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm text-muted-foreground">رقم الجوال</p>
                <p className="font-mono">{acct.phone_number}</p>
              </div>
              <Badge variant="outline" className={TIER_CLASS[acct.tier]}>
                {TIER_LABEL[acct.tier] ?? acct.tier}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Coins className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{acct.points.toLocaleString("ar")}</p>
                  <p className="text-xs text-muted-foreground">نقطة متاحة</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{acct.total_spent_yer.toLocaleString("ar")}</p>
                  <p className="text-xs text-muted-foreground">إجمالي المشتريات (ر.ي)</p>
                </div>
              </div>
            </div>

            {(() => {
              const np = nextTierProgress(acct.total_spent_yer);
              if (!np) return <p className="text-sm text-muted-foreground">🎉 وصلت لأعلى مستوى!</p>;
              return (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>المستوى التالي: {TIER_LABEL[np.nextTier]}</span>
                    <span>{np.remaining.toLocaleString("ar")} ر.ي متبقي</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${np.pct}%` }} />
                  </div>
                </div>
              );
            })()}
          </Card>

          <Card className="p-4">
            <h2 className="font-semibold mb-3">سجل النقاط</h2>
            {txQ.isLoading && <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>}
            {!txQ.isLoading && (txQ.data?.transactions.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">لا توجد عمليات بعد.</p>
            )}
            <ul className="divide-y">
              {txQ.data?.transactions.map((t) => (
                <li key={t.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{t.description ?? t.type}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(t.created_at).toLocaleString("ar")}
                    </p>
                  </div>
                  <span
                    className={`font-mono font-semibold ${
                      t.points >= 0 ? "text-emerald-600" : "text-destructive"
                    }`}
                  >
                    {t.points >= 0 ? "+" : ""}
                    {t.points}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

function LinkPhoneCard() {
  const [phone, setPhone] = useState("");
  const qc = useQueryClient();
  const linkFn = useServerFn(linkLoyaltyAccountByPhone);
  const link = useMutation({
    mutationFn: (p: string) => linkFn({ data: { phone: p } }),
    onSuccess: (res) => {
      toast.success(res.created ? "تم إنشاء حساب ولاء جديد وربطه برقمك" : "تم ربط رقمك بحساب ولاء موجود");
      qc.invalidateQueries({ queryKey: ["my-loyalty"] });
    },
    onError: (e: Error) => {
      const m = e.message === "phone_already_linked_to_other_user"
        ? "هذا الرقم مرتبط بحساب آخر"
        : e.message === "invalid_phone"
        ? "رقم الجوال غير صالح"
        : "تعذر الربط";
      toast.error(m);
    },
  });

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">اربط رقم جوالك بحسابك</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        أدخل رقم جوالك الذي تستخدمه عند الطلب. سنربطه بحسابك ليتم احتساب نقاط الولاء تلقائياً.
      </p>
      <div className="flex gap-2" dir="ltr">
        <Input
          type="tel"
          inputMode="tel"
          placeholder="7XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="font-mono"
        />
        <Button
          onClick={() => link.mutate(phone)}
          disabled={!phone || link.isPending}
        >
          {link.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ربط"}
        </Button>
      </div>
    </Card>
  );
}
