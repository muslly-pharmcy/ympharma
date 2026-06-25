import { createFileRoute, ErrorComponent, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  getAlertSettings,
  updateAlertSettings,
  listAlertSubscribers,
  addAlertSubscriber,
  updateAlertSubscriber,
  deleteAlertSubscriber,
} from "@/lib/alert-settings.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/admin-alert-settings")({
  component: AdminAlertSettings,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-6 space-y-3">
        <ErrorComponent error={error} />
        <Button onClick={() => { router.invalidate(); reset(); }}>إعادة المحاولة</Button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-6">الصفحة غير موجودة</div>,
});

type Settings = {
  uptime_threshold_pct: number;
  growth_threshold_pct: number;
  overdue_orders_threshold: number;
  errors_threshold: number;
  enable_uptime: boolean;
  enable_growth: boolean;
  enable_overdue: boolean;
  enable_errors: boolean;
  enable_slack: boolean;
  enable_sms: boolean;
  enable_whatsapp: boolean;
  enable_email: boolean;
};

function AdminAlertSettings() {
  const qc = useQueryClient();
  const fetchSettings = useServerFn(getAlertSettings);
  const saveSettings = useServerFn(updateAlertSettings);
  const fetchSubs = useServerFn(listAlertSubscribers);
  const addSub = useServerFn(addAlertSubscriber);
  const patchSub = useServerFn(updateAlertSubscriber);
  const delSub = useServerFn(deleteAlertSubscriber);

  const settingsQ = useQuery({ queryKey: ["alert-settings"], queryFn: () => fetchSettings() });
  const subsQ = useQuery({ queryKey: ["alert-subscribers"], queryFn: () => fetchSubs() });

  const [form, setForm] = useState<Settings | null>(null);
  useEffect(() => {
    if (settingsQ.data?.settings && !form) setForm(settingsQ.data.settings as Settings);
  }, [settingsQ.data, form]);

  const saveMu = useMutation({
    mutationFn: (s: Settings) => saveSettings({ data: s }),
    onSuccess: () => { toast.success("تم حفظ الإعدادات"); qc.invalidateQueries({ queryKey: ["alert-settings"] }); },
    onError: (e: any) => toast.error(e?.message ?? "فشل الحفظ"),
  });

  const [newSub, setNewSub] = useState({ label: "", phone_e164: "", receive_sms: true, receive_whatsapp: true, min_severity: "high" as const, active: true });
  const addMu = useMutation({
    mutationFn: () => addSub({ data: newSub }),
    onSuccess: () => {
      toast.success("أُضيف المشترك");
      setNewSub({ label: "", phone_e164: "", receive_sms: true, receive_whatsapp: true, min_severity: "high", active: true });
      qc.invalidateQueries({ queryKey: ["alert-subscribers"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل الإضافة"),
  });

  return (
    <div dir="rtl" className="p-6 space-y-6 max-w-5xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold">ضبط التنبيهات</h1>
        <p className="text-sm text-muted-foreground">عتبات التنبيه، تفعيل/تعطيل الأنواع والقنوات، وقائمة المشتركين.</p>
      </header>

      {/* Thresholds + toggles */}
      <Card className="p-4 space-y-4">
        <h2 className="font-semibold">العتبات والأنواع</h2>
        {form && (
          <div className="grid md:grid-cols-2 gap-4">
            <Row label="عتبة Uptime (%)" enabled={form.enable_uptime} onToggle={(v) => setForm({ ...form, enable_uptime: v })}>
              <Input type="number" min={0} max={100} value={form.uptime_threshold_pct}
                onChange={(e) => setForm({ ...form, uptime_threshold_pct: Number(e.target.value) })} />
            </Row>
            <Row label="عتبة النمو (%)" enabled={form.enable_growth} onToggle={(v) => setForm({ ...form, enable_growth: v })}>
              <Input type="number" min={-100} max={100} value={form.growth_threshold_pct}
                onChange={(e) => setForm({ ...form, growth_threshold_pct: Number(e.target.value) })} />
            </Row>
            <Row label="حد الطلبات المتأخرة" enabled={form.enable_overdue} onToggle={(v) => setForm({ ...form, enable_overdue: v })}>
              <Input type="number" min={0} value={form.overdue_orders_threshold}
                onChange={(e) => setForm({ ...form, overdue_orders_threshold: Number(e.target.value) })} />
            </Row>
            <Row label="حد الأخطاء (24س)" enabled={form.enable_errors} onToggle={(v) => setForm({ ...form, enable_errors: v })}>
              <Input type="number" min={0} value={form.errors_threshold}
                onChange={(e) => setForm({ ...form, errors_threshold: Number(e.target.value) })} />
            </Row>
          </div>
        )}

        <h2 className="font-semibold pt-2">قنوات الإرسال</h2>
        {form && (
          <div className="grid md:grid-cols-4 gap-3">
            <ChannelToggle label="📧 Email" checked={form.enable_email} onChange={(v) => setForm({ ...form, enable_email: v })} />
            <ChannelToggle label="💬 Slack" checked={form.enable_slack} onChange={(v) => setForm({ ...form, enable_slack: v })} />
            <ChannelToggle label="📱 SMS" checked={form.enable_sms} onChange={(v) => setForm({ ...form, enable_sms: v })} />
            <ChannelToggle label="🟢 WhatsApp" checked={form.enable_whatsapp} onChange={(v) => setForm({ ...form, enable_whatsapp: v })} />
          </div>
        )}

        <div className="flex justify-end">
          <Button disabled={!form || saveMu.isPending} onClick={() => form && saveMu.mutate(form)}>
            {saveMu.isPending ? "جارٍ الحفظ…" : "حفظ الإعدادات"}
          </Button>
        </div>
      </Card>

      {/* Subscribers */}
      <Card className="p-4 space-y-4">
        <h2 className="font-semibold">مشتركو SMS / WhatsApp</h2>

        <div className="grid md:grid-cols-6 gap-2 items-end">
          <div className="md:col-span-2">
            <Label>الاسم</Label>
            <Input value={newSub.label} onChange={(e) => setNewSub({ ...newSub, label: e.target.value })} placeholder="Dr. Mohamed" />
          </div>
          <div className="md:col-span-2">
            <Label>الرقم (E.164)</Label>
            <Input value={newSub.phone_e164} onChange={(e) => setNewSub({ ...newSub, phone_e164: e.target.value })} placeholder="+9665XXXXXXXX" />
          </div>
          <div>
            <Label>أدنى شدة</Label>
            <select className="w-full border rounded h-9 px-2" value={newSub.min_severity}
              onChange={(e) => setNewSub({ ...newSub, min_severity: e.target.value as any })}>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="critical">critical</option>
            </select>
          </div>
          <Button onClick={() => addMu.mutate()} disabled={addMu.isPending || !newSub.phone_e164}>
            إضافة
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-right">
              <tr className="border-b">
                <th className="p-2">الاسم</th><th className="p-2">الرقم</th>
                <th className="p-2">SMS</th><th className="p-2">WA</th>
                <th className="p-2">أدنى شدة</th><th className="p-2">نشط</th><th></th>
              </tr>
            </thead>
            <tbody>
              {(subsQ.data?.subscribers ?? []).map((s: any) => (
                <tr key={s.id} className="border-b">
                  <td className="p-2">{s.label ?? "—"}</td>
                  <td className="p-2 font-mono">{s.phone_e164}</td>
                  <td className="p-2"><Switch checked={s.receive_sms} onCheckedChange={(v) => patchSub({ data: { id: s.id, receive_sms: v } }).then(() => qc.invalidateQueries({ queryKey: ["alert-subscribers"] }))} /></td>
                  <td className="p-2"><Switch checked={s.receive_whatsapp} onCheckedChange={(v) => patchSub({ data: { id: s.id, receive_whatsapp: v } }).then(() => qc.invalidateQueries({ queryKey: ["alert-subscribers"] }))} /></td>
                  <td className="p-2">{s.min_severity}</td>
                  <td className="p-2"><Switch checked={s.active} onCheckedChange={(v) => patchSub({ data: { id: s.id, active: v } }).then(() => qc.invalidateQueries({ queryKey: ["alert-subscribers"] }))} /></td>
                  <td className="p-2">
                    <Button size="sm" variant="destructive" onClick={() => {
                      if (confirm("حذف هذا المشترك؟")) delSub({ data: { id: s.id } }).then(() => qc.invalidateQueries({ queryKey: ["alert-subscribers"] }));
                    }}>حذف</Button>
                  </td>
                </tr>
              ))}
              {(subsQ.data?.subscribers ?? []).length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">لا مشتركين</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          ملاحظة: Slack يتطلّب <code>SLACK_WEBHOOK_URL</code>. SMS يتطلّب توصيل Twilio + <code>TWILIO_FROM_NUMBER</code>. WhatsApp يستخدم مفاتيح WhatsApp Cloud المتوفّرة.
        </p>
      </Card>
    </div>
  );
}

function Row({ label, enabled, onToggle, children }: { label: string; enabled: boolean; onToggle: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      <div className={enabled ? "" : "opacity-50 pointer-events-none"}>{children}</div>
    </div>
  );
}

function ChannelToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between border rounded px-3 py-2">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
