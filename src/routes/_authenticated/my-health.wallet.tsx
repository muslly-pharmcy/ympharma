import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getMyWallet } from "@/lib/health-wallet.functions";
import {
  listMyConsents,
  grantConsent,
  revokeConsent,
  CONSENT_SCOPES,
  GRANTEE_TYPES,
  type ConsentScope,
  type GranteeType,
} from "@/lib/patient-consent.functions";
import { GlassCard } from "@/components/futuristic/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/my-health/wallet")({
  head: () => ({
    meta: [
      { title: "المحفظة الصحية — MUSLLY" },
      {
        name: "description",
        content: "المحفظة الصحية الرقمية: الهوية، التغطية التأمينية، الأدوية، الخزنة، المواعيد، الأذونات، وبطاقة الطوارئ.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HealthWalletPage,
  errorComponent: ({ error }) => (
    <div dir="rtl" className="p-8 text-red-500">تعذر التحميل: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">غير موجود</div>,
});

function HealthWalletPage() {
  const fetchWallet = useServerFn(getMyWallet);
  const fetchConsents = useServerFn(listMyConsents);

  const wallet = useQuery({
    queryKey: ["health-wallet"],
    queryFn: () => fetchWallet(),
  });
  const consents = useQuery({
    queryKey: ["health-wallet", "consents"],
    queryFn: () => fetchConsents(),
  });

  if (wallet.isLoading) {
    return <div dir="rtl" className="p-8 text-muted-foreground">جاري تحميل المحفظة…</div>;
  }
  if (wallet.error) {
    return <div dir="rtl" className="p-8 text-red-500">خطأ: {(wallet.error as Error).message}</div>;
  }
  const data = wallet.data!;

  if (!data.identity) {
    return (
      <div dir="rtl" className="p-8">
        <GlassCard className="p-6 max-w-lg mx-auto">
          <h1 className="text-xl font-semibold mb-2">لم يتم إنشاء ملف طبي بعد</h1>
          <p className="text-sm text-muted-foreground">
            افتح صفحة <a href="/my-health" className="text-teal-400 underline">ملفي الصحي</a> لإنشاء ملف طبي أولاً.
          </p>
        </GlassCard>
      </div>
    );
  }

  const { identity, medications, vault, upcoming_appointments, coverage, emergency } = data;

  return (
    <div dir="rtl" className="min-h-screen p-6 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-teal-400">💳 المحفظة الصحية الرقمية</h1>
        <p className="text-sm text-muted-foreground mt-1">
          كل بياناتك الصحية في مكان واحد — أنت المتحكم الوحيد فيها.
        </p>
      </header>

      <Tabs defaultValue="identity" dir="rtl">
        <TabsList className="grid grid-cols-3 md:grid-cols-7 w-full">
          <TabsTrigger value="identity">الهوية</TabsTrigger>
          <TabsTrigger value="coverage">التأمين</TabsTrigger>
          <TabsTrigger value="medications">الأدوية</TabsTrigger>
          <TabsTrigger value="vault">الخزنة</TabsTrigger>
          <TabsTrigger value="appointments">المواعيد</TabsTrigger>
          <TabsTrigger value="consents">الأذونات</TabsTrigger>
          <TabsTrigger value="emergency">الطوارئ</TabsTrigger>
        </TabsList>

        <TabsContent value="identity">
          <GlassCard className="p-6 space-y-2">
            <Field label="الاسم" value={identity.full_name} />
            <Field label="الهاتف" value={identity.phone ?? "—"} />
            <Field label="تاريخ الميلاد" value={identity.date_of_birth ?? "—"} />
            <Field label="الجنس" value={identity.gender ?? "—"} />
            <Field label="معرّف المريض" value={identity.patient_id} mono />
          </GlassCard>
        </TabsContent>

        <TabsContent value="coverage">
          <GlassCard className="p-6">
            {coverage.length === 0 ? (
              <p className="text-muted-foreground">لا توجد تغطية تأمينية مسجّلة.</p>
            ) : (
              <ul className="space-y-2">
                {coverage.map((c) => (
                  <li key={c.id} className="border-b border-teal-900/20 py-2 text-sm">
                    <div>وثيقة: <span className="font-mono">{c.policy_no ?? "—"}</span></div>
                    <div className="text-xs text-muted-foreground">
                      سارية حتى: {c.valid_to ?? "غير محدد"} · نسبة المشاركة: {c.copay_percent ?? 0}%
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </TabsContent>

        <TabsContent value="medications">
          <GlassCard className="p-6">
            {medications.length === 0 ? (
              <p className="text-muted-foreground">لا توجد أدوية نشطة.</p>
            ) : (
              <ul className="space-y-2">
                {medications.map((m) => (
                  <li key={m.id} className="border-b border-teal-900/20 py-2 text-sm">
                    <div className="font-medium">{m.medicine_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.dosage ?? "—"} · {m.frequency ?? "—"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </TabsContent>

        <TabsContent value="vault">
          <GlassCard className="p-6">
            {vault.length === 0 ? (
              <p className="text-muted-foreground">الخزنة فارغة.</p>
            ) : (
              <ul className="space-y-2">
                {vault.map((f) => (
                  <li key={f.id} className="border-b border-teal-900/20 py-2 text-sm flex justify-between">
                    <span>{f.title}</span>
                    <Badge variant="secondary">{f.file_type}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </TabsContent>

        <TabsContent value="appointments">
          <GlassCard className="p-6">
            {upcoming_appointments.length === 0 ? (
              <p className="text-muted-foreground">لا توجد مواعيد قادمة.</p>
            ) : (
              <ul className="space-y-2">
                {upcoming_appointments.map((a) => (
                  <li key={a.id} className="border-b border-teal-900/20 py-2 text-sm">
                    {new Date(a.starts_at).toLocaleString("ar-EG")}{" "}
                    <Badge variant="outline" className="mr-2">{a.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </TabsContent>

        <TabsContent value="consents">
          <ConsentsPanel
            consents={consents.data ?? []}
            loading={consents.isLoading}
            error={consents.error as Error | null}
          />
        </TabsContent>

        <TabsContent value="emergency">
          <EmergencyCard emergency={emergency} identity={identity} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between text-sm border-b border-teal-900/20 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : ""}>{value}</span>
    </div>
  );
}

function EmergencyCard({
  emergency,
  identity,
}: {
  emergency: { blood_type: string | null; allergies: string[]; emergency_contact: string | null };
  identity: { full_name: string };
}) {
  return (
    <GlassCard className="p-6 border-red-500/40">
      <div className="text-red-400 font-semibold mb-3">🚨 بطاقة الطوارئ</div>
      <Field label="الاسم" value={identity.full_name} />
      <Field label="فصيلة الدم" value={emergency.blood_type ?? "غير مسجّل"} />
      <Field
        label="الحساسيات"
        value={emergency.allergies.length ? emergency.allergies.join("، ") : "لا يوجد"}
      />
      <Field label="جهة الاتصال" value={emergency.emergency_contact ?? "غير مسجّل"} />
      <p className="text-xs text-muted-foreground mt-3">
        هذه البطاقة تُعرض داخل حسابك فقط. مشاركتها للعامة قيد التطوير.
      </p>
    </GlassCard>
  );
}

function ConsentsPanel({
  consents,
  loading,
  error,
}: {
  consents: import("@/lib/patient-consent.functions").ConsentRow[];
  loading: boolean;
  error: Error | null;
}) {
  const qc = useQueryClient();
  const grant = useServerFn(grantConsent);
  const revoke = useServerFn(revokeConsent);

  const [granteeType, setGranteeType] = useState<GranteeType>("doctor");
  const [granteeId, setGranteeId] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<Set<ConsentScope>>(new Set(["medications"]));
  const [expiresAt, setExpiresAt] = useState("");

  const grantMut = useMutation({
    mutationFn: async () => {
      if (!granteeId) throw new Error("أدخل معرّف الجهة");
      return grant({
        data: {
          granted_to_type: granteeType,
          granted_to_id: granteeId,
          scopes: Array.from(selectedScopes),
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("تم منح الإذن");
      setGranteeId("");
      qc.invalidateQueries({ queryKey: ["health-wallet", "consents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => {
      toast.success("تم سحب الإذن");
      qc.invalidateQueries({ queryKey: ["health-wallet", "consents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <GlassCard className="p-6 space-y-3">
        <h2 className="font-semibold">منح إذن جديد</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>نوع الجهة</Label>
            <Select value={granteeType} onValueChange={(v) => setGranteeType(v as GranteeType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GRANTEE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>معرّف الجهة (UUID)</Label>
            <Input value={granteeId} onChange={(e) => setGranteeId(e.target.value)} placeholder="doctor id / pharmacy id …" />
          </div>
          <div className="md:col-span-2">
            <Label>الصلاحيات</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {CONSENT_SCOPES.map((s) => {
                const on = selectedScopes.has(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      const next = new Set(selectedScopes);
                      if (on) next.delete(s);
                      else next.add(s);
                      setSelectedScopes(next);
                    }}
                    className={`text-xs px-3 py-1 rounded-full border ${
                      on
                        ? "bg-teal-500/20 border-teal-400 text-teal-200"
                        : "border-teal-900/30 text-muted-foreground"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label>تنتهي في (اختياري)</Label>
            <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
        </div>
        <Button
          onClick={() => grantMut.mutate()}
          disabled={grantMut.isPending || selectedScopes.size === 0}
        >
          {grantMut.isPending ? "…" : "منح الإذن"}
        </Button>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="font-semibold mb-3">الأذونات الحالية</h2>
        {loading ? (
          <p className="text-muted-foreground">…</p>
        ) : error ? (
          <p className="text-red-500">{error.message}</p>
        ) : consents.length === 0 ? (
          <p className="text-muted-foreground">لا توجد أذونات ممنوحة.</p>
        ) : (
          <ul className="space-y-2">
            {consents.map((c) => (
              <li key={c.id} className="flex items-center justify-between border-b border-teal-900/20 py-2 text-sm">
                <div>
                  <div>
                    <Badge variant={c.active ? "default" : "secondary"} className="ml-2">
                      {c.active ? "نشط" : "ملغى"}
                    </Badge>
                    {c.granted_to_type} → <span className="font-mono text-xs">{c.granted_to_id.slice(0, 8)}…</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    الصلاحيات: {(c.scope ?? []).join("، ")}
                    {c.expires_at ? ` · تنتهي: ${new Date(c.expires_at).toLocaleDateString("ar-EG")}` : ""}
                  </div>
                </div>
                {c.active && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => revokeMut.mutate(c.id)}
                    disabled={revokeMut.isPending}
                  >
                    سحب
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
