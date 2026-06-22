import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import * as XLSX from "xlsx";
import { AdminGate } from "@/components/admin/AdminGate";
import { runInventorySync, type SyncReport } from "@/lib/inventory-sync.functions";

export const Route = createFileRoute("/_authenticated/admin-upload-inventory")({
  component: () => (
    <AdminGate>
      <UploadPage />
    </AdminGate>
  ),
});

type Status = "idle" | "parsing" | "syncing" | "done" | "error";

// Map Arabic-headed XLS row → our typed row. Forgiving with header variants.
function pick(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}
function toNumber(s: string): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(/,/g, ".").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function toIsoDate(s: string): string | null {
  if (!s) return null;
  // Excel dates sometimes come as serial numbers
  const asNum = Number(s);
  if (Number.isFinite(asNum) && asNum > 10000 && asNum < 80000) {
    const d = XLSX.SSF.parse_date_code(asNum);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const m = s.match(/(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})/);
  if (!m) return null;
  let [_, a, b, c] = m;
  // Heuristic: if first is 4 digits → YYYY-MM-DD, else DD/MM/YYYY
  if (a.length === 4) return `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
  const yyyy = c.length === 2 ? `20${c}` : c;
  return `${yyyy}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
}

function UploadPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [rowsCount, setRowsCount] = useState(0);
  const sync = useServerFn(runInventorySync);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null); setReport(null); setStatus("parsing");
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      const rows = json
        .map((r) => {
          const legacyStr = pick(r, ["الكـود", "الكود", "Code", "code"]);
          const legacyId = parseInt(legacyStr.replace(/\D/g, ""), 10);
          if (!legacyId) return null;
          return {
            legacyId,
            name: pick(r, ["اســم الصـــنف", "اسم الصنف", "Name", "name"]),
            supplier: pick(r, ["المــــــــورد", "المورد", "Supplier"]) || null,
            expiry: toIsoDate(pick(r, ["تاريخ الإنتهاء", "تاريخ الانتهاء", "Expiry"])),
            stock: Math.floor(toNumber(pick(r, ["الرصيــــد", "الرصيد", "Stock", "Qty"]))),
            price: toNumber(pick(r, ["السعر", "القيمــــــة", "القيمة", "Price"])),
            category: pick(r, ["التصنيف", "Category"]) || null,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null && !!x.name);
      if (rows.length === 0) throw new Error("لم يُعثر على صفوف صالحة في الملف (تحقق من أسماء الأعمدة).");
      setRowsCount(rows.length);
      setStatus("syncing");
      const res = await sync({ data: { rows } });
      setReport(res);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    } finally {
      e.target.value = "";
    }
  }

  const busy = status === "parsing" || status === "syncing";

  return (
    <div dir="rtl" className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl font-black">📤 رفع ومزامنة المخزون من إكسيل</h1>
          <p className="text-sm text-muted-foreground">
            ارفع ملف <code>الاصناف2030.xls</code> أو ما يشابهه. سيتم تحديث الموجود وإضافة الجديد وإخفاء غير الموجود في الملف.
          </p>
        </header>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <label className="block">
            <span className="text-sm font-bold">اختر الملف (.xls / .xlsx)</span>
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={handleFile}
              disabled={busy}
              className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground file:font-bold disabled:opacity-50"
            />
          </label>

          {status === "parsing" && <p className="text-sm">⏳ جاري قراءة الملف…</p>}
          {status === "syncing" && (
            <p className="text-sm">🔄 جاري مزامنة {rowsCount.toLocaleString("ar")} صف مع قاعدة البيانات…</p>
          )}
          {status === "error" && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              ❌ {error}
            </div>
          )}
          {status === "done" && report && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-2">
              <p className="font-bold text-emerald-700 dark:text-emerald-400">✅ تمت المزامنة بنجاح</p>
              <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <li>📊 الإجمالي: <b>{report.total}</b></li>
                <li>♻️ مُحدّث: <b>{report.updated}</b></li>
                <li>🆕 مُضاف: <b>{report.inserted}</b></li>
                <li>📢 أُعيد نشره: <b>{report.republished}</b></li>
                <li>🙈 مُخفي: <b>{report.hidden}</b></li>
                <li>⚠️ أخطاء: <b>{report.errors.length}</b></li>
              </ul>
              {report.errors.length > 0 && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer font-bold">عرض الأخطاء ({report.errors.length})</summary>
                  <ul className="mt-2 max-h-60 overflow-auto space-y-1">
                    {report.errors.slice(0, 100).map((e, i) => (
                      <li key={i} className="text-destructive">#{e.legacyId}: {e.message}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-dashed border-border bg-card/50 p-4 text-xs text-muted-foreground">
          <p className="font-bold mb-1">الأعمدة المتوقعة:</p>
          <p>الكـود، اســم الصـــنف، المــــــــورد، تاريخ الإنتهاء، الرصيــــد، السعر/القيمة.</p>
          <p className="mt-1">يتم تشغيل الفحص مع كل مزامنة وتُسجَّل النتيجة في <code>activity_logs</code>.</p>
        </div>
      </div>
    </div>
  );
}
