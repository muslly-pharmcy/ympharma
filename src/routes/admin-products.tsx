import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Upload, Save, ArrowRight, FileSpreadsheet, Link as LinkIcon } from "lucide-react";
import { listAllProducts, upsertProduct, deleteProduct, bulkImportProducts, importFromGoogleSheet, importFromGoogleDrive } from "@/lib/products-admin.functions";

const CSV_TEMPLATE = "name,brand,price,old_price,category,image_url,badge,description\nبانادول 500مج,GSK,1850,2100,medicine,https://example.com/img.jpg,خصم,شريط 24 قرص\nفيتامين سي 1000,NOW,7800,,vitamins,,جديد,60 قرص\n";
function downloadTemplate(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export const Route = createFileRoute("/admin-products")({
  head: () => ({ meta: [{ title: "إدارة الأصناف — صيدلية المصلي" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminProducts,
});

type Row = {
  id: string; name: string; brand: string | null; price: number; old_price: number | null;
  category: string; image_url: string | null; badge: string | null; description: string | null;
  is_published: boolean;
};

function AdminProducts() {
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const list = useServerFn(listAllProducts);
  const save = useServerFn(upsertProduct);
  const del = useServerFn(deleteProduct);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = "/admin"; return; }
      setReady(true);
    });
  }, []);

  const load = useCallback(async () => {
    setBusy(true);
    try { setRows((await list({})) as Row[]); }
    catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }, [list]);

  useEffect(() => { if (ready) load(); }, [ready, load]);

  async function handleSave(p: Partial<Row>) {
    try {
      await save({ data: {
        id: p.id, name: p.name ?? "", brand: p.brand ?? "",
        price: Number(p.price) || 0, old_price: p.old_price ? Number(p.old_price) : null,
        category: p.category ?? "medicine", image_url: p.image_url ?? "",
        badge: p.badge ?? "", description: p.description ?? "",
        is_published: p.is_published ?? true,
      } as any });
      toast.success("تم الحفظ");
      setEditing(null);
      load();
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
  }

  async function handleDelete(id: string) {
    if (!confirm("حذف هذا الصنف نهائياً؟")) return;
    try { await del({ data: { id } }); toast.success("تم الحذف"); load(); }
    catch (e: any) { toast.error(String(e?.message ?? e)); }
  }

  if (!ready) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Link to="/admin" className="grid size-10 place-items-center rounded-xl bg-secondary hover:bg-accent" aria-label="رجوع"><ArrowRight className="size-4" /></Link>
            <h1 className="text-sm font-black">إدارة الأصناف</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setImportOpen(true)} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white">
              <FileSpreadsheet className="size-4" /> استيراد Excel/Sheets
            </button>
            <button onClick={() => setEditing({})} className="brand-gradient flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black text-primary-foreground">
              <Plus className="size-4" /> صنف جديد
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-3 px-4 py-6">
        {busy && <div className="grid place-items-center py-10"><Loader2 className="size-5 animate-spin" /></div>}
        {!busy && rows.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">
            لا توجد أصناف بعد. أضف صنفاً جديداً أو استورد من Excel/Google Sheets.
          </div>
        )}
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-right text-sm">
            <thead className="bg-secondary/60 text-xs">
              <tr>
                <th className="p-3">الاسم</th>
                <th className="p-3">التصنيف</th>
                <th className="p-3">السعر</th>
                <th className="p-3">القديم</th>
                <th className="p-3">منشور</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3"><div className="font-bold">{r.name}</div><div className="text-xs text-muted-foreground">{r.brand}</div></td>
                  <td className="p-3 text-xs">{r.category}</td>
                  <td className="p-3 font-bold">{Number(r.price).toLocaleString("ar-EG")}</td>
                  <td className="p-3 text-xs text-muted-foreground">{r.old_price ? Number(r.old_price).toLocaleString("ar-EG") : "—"}</td>
                  <td className="p-3">{r.is_published ? "✅" : "—"}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(r)} className="rounded-lg bg-secondary px-2 py-1 text-xs font-bold hover:bg-accent">تعديل</button>
                      <button onClick={() => handleDelete(r.id)} className="grid size-7 place-items-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100" aria-label="حذف"><Trash2 className="size-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {editing && <EditModal initial={editing} onClose={() => setEditing(null)} onSave={handleSave} />}
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onDone={load} />}
    </div>
  );
}

function EditModal({ initial, onClose, onSave }: { initial: Partial<Row>; onClose: () => void; onSave: (p: Partial<Row>) => void }) {
  const [p, setP] = useState<Partial<Row>>({ is_published: true, ...initial });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg space-y-3 rounded-3xl bg-card p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-black">{p.id ? "تعديل صنف" : "صنف جديد"}</h2>
        <Field label="الاسم"><input className="i" value={p.name ?? ""} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
        <Field label="الماركة"><input className="i" value={p.brand ?? ""} onChange={(e) => setP({ ...p, brand: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="السعر"><input type="number" className="i" value={p.price ?? 0} onChange={(e) => setP({ ...p, price: Number(e.target.value) })} /></Field>
          <Field label="السعر القديم"><input type="number" className="i" value={p.old_price ?? ""} onChange={(e) => setP({ ...p, old_price: e.target.value ? Number(e.target.value) : null })} /></Field>
        </div>
        <Field label="التصنيف">
          <select className="i" value={p.category ?? "medicine"} onChange={(e) => setP({ ...p, category: e.target.value })}>
            {["medicine","kids","devices","cosmetics","vitamins","now","herbal"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="رابط الصورة"><input className="i" dir="ltr" value={p.image_url ?? ""} onChange={(e) => setP({ ...p, image_url: e.target.value })} /></Field>
        <Field label="شارة (اختياري)"><input className="i" value={p.badge ?? ""} onChange={(e) => setP({ ...p, badge: e.target.value })} /></Field>
        <Field label="الوصف"><textarea className="i min-h-20" value={p.description ?? ""} onChange={(e) => setP({ ...p, description: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.is_published ?? true} onChange={(e) => setP({ ...p, is_published: e.target.checked })} /> منشور للعملاء</label>
        <div className="flex gap-2">
          <button onClick={() => onSave(p)} className="brand-gradient flex flex-1 items-center justify-center gap-1.5 rounded-2xl px-5 py-2.5 text-sm font-black text-primary-foreground">
            <Save className="size-4" /> حفظ
          </button>
          <button onClick={onClose} className="rounded-2xl bg-secondary px-5 py-2.5 text-sm font-bold">إلغاء</button>
        </div>
        <style>{`.i{width:100%;border:1px solid hsl(var(--border));background:hsl(var(--secondary)/.4);border-radius:.75rem;padding:.5rem .75rem;font-size:.875rem;outline:none}`}</style>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs font-bold text-muted-foreground">{label}</span>{children}</label>;
}

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [sheetUrl, setSheetUrl] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [csvText, setCsvText] = useState("");
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const importSheet = useServerFn(importFromGoogleSheet);
  const importDrive = useServerFn(importFromGoogleDrive);
  const bulkInsert = useServerFn(bulkImportProducts);

  async function runSheet() {
    if (!sheetUrl.trim()) return toast.error("ألصق رابط Google Sheet");
    setBusy(true);
    try {
      const r = await importSheet({ data: { sheetUrl, replace } });
      toast.success(`تم استيراد ${r.inserted} صنف`);
      onDone(); onClose();
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }
  async function runDrive() {
    if (!driveUrl.trim()) return toast.error("ألصق رابط ملف Google Drive");
    setBusy(true);
    try {
      const r = await importDrive({ data: { driveUrl, replace } });
      toast.success(`تم استيراد ${r.inserted} صنف`);
      onDone(); onClose();
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }
  async function runCsv() {
    setBusy(true);
    try {
      const rows = parseCsv(csvText);
      if (rows.length < 2) throw new Error("الجدول فارغ");
      const h = rows[0].map((x) => x.trim().toLowerCase());
      const ix = (k: string) => h.indexOf(k);
      const data = rows.slice(1).filter((r) => r[ix("name")]?.trim()).map((r) => ({
        name: r[ix("name")].trim(),
        brand: ix("brand") >= 0 ? r[ix("brand")] : "",
        price: Number((r[ix("price")] || "0").replace(/[^\d.]/g, "")) || 0,
        old_price: ix("old_price") >= 0 && r[ix("old_price")] ? Number(r[ix("old_price")].replace(/[^\d.]/g, "")) : null,
        category: r[ix("category")] || "medicine",
        image_url: ix("image_url") >= 0 ? r[ix("image_url")] : "",
        badge: ix("badge") >= 0 ? r[ix("badge")] : "",
        description: ix("description") >= 0 ? r[ix("description")] : "",
      }));
      const r = await bulkInsert({ data: { rows: data as any, replace } });
      toast.success(`تم استيراد ${r.inserted} صنف`);
      onDone(); onClose();
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl space-y-4 rounded-3xl bg-card p-6 shadow-elevated max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-black">استيراد أصناف من Excel / Google Sheets / Google Drive</h2>
        <p className="text-xs text-muted-foreground">الأعمدة المطلوبة: <code>name, price, category</code> — والاختيارية: <code>brand, old_price, image_url, badge, description</code></p>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => downloadTemplate("products-template.csv", CSV_TEMPLATE, "text/csv;charset=utf-8")} className="rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">⬇ قالب CSV</button>
          <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`} download="products-template-excel.csv" className="rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">⬇ قالب Excel</a>
          <a href="https://docs.google.com/spreadsheets/create" target="_blank" rel="noopener" className="rounded-xl bg-secondary px-3 py-2 text-xs font-bold hover:bg-accent">+ شيت جديد في Google</a>
        </div>

        <div className="space-y-2 rounded-2xl border border-border bg-secondary/30 p-4">
          <div className="flex items-center gap-2 text-sm font-black"><LinkIcon className="size-4" /> Google Sheets (CSV عام)</div>
          <p className="text-xs text-muted-foreground">شارك الشيت "أي شخص لديه الرابط" ثم ألصق الرابط:</p>
          <input dir="ltr" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/.../edit" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none" />
          <button onClick={runSheet} disabled={busy} className="brand-gradient inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black text-primary-foreground disabled:opacity-50">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} استيراد من Google Sheets
          </button>
        </div>

        <div className="space-y-2 rounded-2xl border border-border bg-secondary/30 p-4">
          <div className="flex items-center gap-2 text-sm font-black"><LinkIcon className="size-4" /> Google Drive (ملف Excel/CSV)</div>
          <p className="text-xs text-muted-foreground">ارفع ملف .xlsx أو .csv على Drive، شاركه "أي شخص لديه الرابط"، وألصق الرابط:</p>
          <input dir="ltr" value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} placeholder="https://drive.google.com/file/d/.../view" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none" />
          <button onClick={runDrive} disabled={busy} className="brand-gradient inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black text-primary-foreground disabled:opacity-50">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} استيراد من Google Drive
          </button>
        </div>



        <div className="space-y-2 rounded-2xl border border-border bg-secondary/30 p-4">
          <div className="flex items-center gap-2 text-sm font-black"><FileSpreadsheet className="size-4" /> ألصق CSV من Excel</div>
          <p className="text-xs text-muted-foreground">في Excel: احفظ كـ CSV ثم افتحه بمحرر نصوص وألصق المحتوى هنا.</p>
          <textarea dir="ltr" value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder="name,brand,price,category&#10;Panadol,GSK,1850,medicine" className="h-32 w-full rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none" />
          <button onClick={runCsv} disabled={busy || !csvText.trim()} className="brand-gradient inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black text-primary-foreground disabled:opacity-50">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} استيراد CSV
          </button>
        </div>

        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
          استبدال جميع الأصناف الحالية (حذف الكل ثم استيراد)
        </label>
        <button onClick={onClose} className="w-full rounded-2xl bg-secondary px-5 py-2.5 text-sm font-bold">إغلاق</button>
      </div>
    </div>
  );
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false; else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === "\r") {} else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
