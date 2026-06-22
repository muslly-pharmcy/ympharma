import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bell, Gift, RefreshCw, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listMarketingCampaigns,
  runReactivationCampaign,
  runLoyaltyReminderCampaign,
} from "@/lib/marketing-automation.functions";

export const Route = createFileRoute("/_authenticated/admin-marketing-campaigns")({
  component: MarketingCampaignsPage,
});

function MarketingCampaignsPage() {
  const fetchCampaigns = useServerFn(listMarketingCampaigns);
  const reactivate = useServerFn(runReactivationCampaign);
  const remindLoyalty = useServerFn(runLoyaltyReminderCampaign);
  const qc = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["marketing-campaigns"],
    queryFn: () => fetchCampaigns(),
    refetchInterval: 30_000,
  });

  const reactivateMut = useMutation({
    mutationFn: () => reactivate({ data: { days: 30, limit: 100 } }),
    onSuccess: (r) => {
      toast.success(`تم جدولة ${r.queued} رسالة إعادة تنشيط`);
      qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const loyaltyMut = useMutation({
    mutationFn: () => remindLoyalty({ data: { maxPoints: 50, limit: 200 } }),
    onSuccess: (r) => {
      toast.success(`تم جدولة ${r.queued} تذكير ولاء`);
      qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <header>
        <h1 className="text-2xl font-bold">📢 الحملات التسويقية</h1>
        <p className="text-sm text-muted-foreground mt-1">
          شغّل الحملات يدوياً، أو اعتمد على الجدولة التلقائية (pg_cron).
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CampaignCard
          icon={<RefreshCw className="size-5" />}
          title="إعادة التنشيط"
          desc="رسالة للعملاء غير النشطين منذ 30 يوماً"
          schedule="آلياً: كل اثنين 9 ص"
          onRun={() => reactivateMut.mutate()}
          loading={reactivateMut.isPending}
        />
        <CampaignCard
          icon={<Gift className="size-5" />}
          title="تذكير الولاء"
          desc="تذكير العملاء بنقاطهم غير المستردة"
          schedule="آلياً: يومياً 10 ص"
          onRun={() => loyaltyMut.mutate()}
          loading={loyaltyMut.isPending}
        />
        <CampaignCard
          icon={<Bell className="size-5" />}
          title="تنبيهات إعادة التوفر"
          desc="إعلام المشتركين عند عودة المنتجات للمخزون"
          schedule="آلياً: كل 4 ساعات"
          onRun={() => toast.info("تعمل تلقائياً عبر cron — أو شغّلها لمنتج محدد من صفحة المنتج.")}
          loading={false}
          disabled
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>📋 تاريخ الحملات</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : !campaigns || campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد حملات سابقة بعد.</p>
          ) : (
            <ul className="divide-y">
              {campaigns.map((c) => (
                <li key={c.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleString("ar-YE")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary">{c.type}</Badge>
                    <Badge>{c.sent_to} مرسلة</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CampaignCard({
  icon,
  title,
  desc,
  schedule,
  onRun,
  loading,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  schedule: string;
  onRun: () => void;
  loading: boolean;
  disabled?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{desc}</p>
        <p className="text-xs text-muted-foreground">⏱ {schedule}</p>
        <Button onClick={onRun} disabled={loading || disabled} className="w-full gap-2">
          <Play className="size-4" />
          {loading ? "جاري التشغيل..." : "تشغيل الآن"}
        </Button>
      </CardContent>
    </Card>
  );
}
