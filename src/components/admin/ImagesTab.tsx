import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { RefreshCw, Loader2, Save, Plus, X, ImageOff, CheckCircle2, XCircle } from "lucide-react";
import {
  listImgProxyLogs,
  getImgProxySettings,
  updateImgProxySettings,
} from "@/lib/img-proxy-admin.functions";

type LogRow = {
  id: number;
  created_at: string;
  host: string | null;
  url: string;
  status: number;
  ok: boolean;
  error: string | null;
  duration_ms: number | null;
};

export function ImagesTab() {
  const fetchLogs = useServerFn(listImgProxyLogs);
  const fetchSettings = useServerFn(getImgProxySettings);
  const saveSettings = useServerFn(updateImgProxySettings);

  const [rows, setRows] = useState<LogRow[]>([]);
  const [stats, setStats] = useState<{ total: number; failures: number }>({ total: 0, failures: 0 });
  const [logsBusy, setLogsBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "fail">("all");

  const [domain, setDomain] = useState("muslly.com");
  const [hosts, setHosts] = useState<string[]>([]);
  const [newHost, setNewHost] = useState("");
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  async function loadLogs() {
    setLogsBusy(true);
    try {
      const res = await fetchLogs();
      setRows(res.rows as LogRow[]);
      setStats({ total: res.total, failures: res.failures });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر تحميل السجل");
    } finally {
      setLogsBusy(false);
    }
  }

  async function loadSettings() {
    try {
      const s = await fetchSettings();
      setDomain(s.image_domain ?? "muslly.com");
      setHosts((s.allowed_hosts as string[]) ?? []);
      setUpdatedAt(s.updated_at);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر تحميل الإعدادات");
    }
  }

  useEffect(() => {
    void loadLogs();
    void loadSettings();
  }, []);

  function addHost() {
    const h = newHost.trim().toLowerCase();
    if (!h) return;
    if (hosts.includes(h)) {
      toast.info("المضيف موجود بالفعل");
      return;
    }
    setHosts([...hosts, h]);
    setNewHost("");
  }

  function removeHost(h: string) {
    setHosts(hosts.filter((x) => x !== h));
  }

  async function save() {
    setSettingsBusy(true);
    try {
      await saveSettings({ data: { image_domain: domain.trim().toLowerCase(), allowed_hosts: hosts } });
      toast.success("تم حفظ الإعدادات");
      await loadSettings();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر الحفظ");
    } finally {
      setSettingsBusy(false);
    }
  }

  const visible = rows.filter((r) => (filter === "fail" ? !r.ok : true));

  return (
    <div className="space-y-6">
      {/* Settings panel */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-black">🖼️ إعدادات بروكسي الصور</h2>
          {updatedAt && (
            <span className="text-xs text-muted-foreground">آخر تحديث: {new Date(updatedAt).toLocaleString("ar")}</span>
          )}
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-muted-foreground">نطاق الصور المعتمد</span>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              dir="ltr"
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono"
              placeholder="muslly.com"
            />
            <span className="text-[11px] text-muted-foreground">يُستخدم للإشارة لمصدر الصور الذي يصل لزوار اليمن.</span>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-muted-foreground">إضافة مضيف للقائمة البيضاء</span>
            <div className="flex gap-2">
              <input
                value={newHost}
                onChange={(e) => setNewHost(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHost())}
                dir="ltr"
                placeholder="example.com"
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono"
              />
              <button onClick={addHost} className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-black text-primary-foreground hover:opacity-90">
                <Plus className="size-4" /> إضافة
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-xs font-bold text-muted-foreground">المضيفون المسموح بهم ({hosts.length})</div>
          {hosts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">لا يوجد مضيفون — أضف مضيفًا واحدًا على الأقل قبل الحفظ.</div>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {hosts.map((h) => (
                <li key={h} className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold">
                  <span dir="ltr" className="font-mono">{h}</span>
                  <button onClick={() => removeHost(h)} className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground" aria-label={`حذف ${h}`}>
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={save}
            disabled={settingsBusy || hosts.length === 0}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {settingsBusy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            حفظ الإعدادات
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          ملاحظة: التعديلات تُطبَّق تلقائيًا خلال 60 ثانية دون نشر جديد.
        </p>
      </section>

      {/* Logs panel */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black">سجل أخطاء بروكسي الصور</h2>
            <p className="text-xs text-muted-foreground">آخر {stats.total} محاولة · {stats.failures} فشل</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={filter} onChange={(e) => setFilter(e.target.value as "all" | "fail")} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-bold">
              <option value="all">كل المحاولات</option>
              <option value="fail">الفاشلة فقط</option>
            </select>
            <button onClick={loadLogs} disabled={logsBusy} className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-black hover:bg-accent disabled:opacity-50">
              {logsBusy ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              تحديث
            </button>
          </div>
        </header>

        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <ImageOff className="mx-auto mb-2 size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">لا توجد سجلات بعد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-secondary/60 text-right">
                <tr>
                  <th className="px-2 py-2 font-black">الحالة</th>
                  <th className="px-2 py-2 font-black">المضيف</th>
                  <th className="px-2 py-2 font-black">رمز HTTP</th>
                  <th className="px-2 py-2 font-black">السبب</th>
                  <th className="px-2 py-2 font-black">المدة</th>
                  <th className="px-2 py-2 font-black">الوقت</th>
                  <th className="px-2 py-2 font-black">الرابط</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="px-2 py-2">
                      {r.ok ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="size-3.5" /> ناجحة</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="size-3.5" /> فاشلة</span>
                      )}
                    </td>
                    <td className="px-2 py-2 font-mono" dir="ltr">{r.host ?? "—"}</td>
                    <td className="px-2 py-2 font-mono">{r.status}</td>
                    <td className="px-2 py-2">{r.error ?? "—"}</td>
                    <td className="px-2 py-2 font-mono">{r.duration_ms ?? "—"} ms</td>
                    <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">{new Date(r.created_at).toLocaleString("ar")}</td>
                    <td className="px-2 py-2">
                      <span dir="ltr" className="line-clamp-1 max-w-[260px] font-mono text-[10px] text-muted-foreground" title={r.url}>{r.url}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
