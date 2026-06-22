// CLI inventory sync: reads ./الاصناف2030.xls (or path via argv) and upserts into products.
// Run: bun run scripts/sync-inventory.ts [path/to/file.xls]
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import * as fs from "fs";

const FILE = process.argv[2] || "./الاصناف2030.xls";
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error("❌ SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY مطلوبان في البيئة.");
  process.exit(1);
}
if (!fs.existsSync(FILE)) {
  console.error(`❌ الملف غير موجود: ${FILE}`);
  process.exit(1);
}

const sb = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

function pick(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) { const v = row[k]; if (v != null && String(v).trim() !== "") return String(v).trim(); }
  return "";
}
function toNumber(s: string): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(/,/g, ".").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function toIsoDate(s: string): string | null {
  if (!s) return null;
  const asNum = Number(s);
  if (Number.isFinite(asNum) && asNum > 10000 && asNum < 80000) {
    const d = XLSX.SSF.parse_date_code(asNum);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const m = s.match(/(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})/);
  if (!m) return null;
  const [, a, b, c] = m;
  if (a.length === 4) return `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
  const yyyy = c.length === 2 ? `20${c}` : c;
  return `${yyyy}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
}

async function main() {
  console.log(`📂 قراءة ${FILE}…`);
  const wb = XLSX.readFile(FILE);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const rows = json.map((r) => {
    const legacyId = parseInt(pick(r, ["الكـود", "الكود", "Code"]).replace(/\D/g, ""), 10);
    if (!legacyId) return null;
    return {
      legacyId,
      name: pick(r, ["اســم الصـــنف", "اسم الصنف", "Name"]),
      supplier: pick(r, ["المــــــــورد", "المورد"]) || null,
      expiry: toIsoDate(pick(r, ["تاريخ الإنتهاء", "تاريخ الانتهاء"])),
      stock: Math.floor(toNumber(pick(r, ["الرصيــــد", "الرصيد"]))),
      price: toNumber(pick(r, ["السعر", "القيمــــــة", "القيمة"])),
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null && !!x.name);
  console.log(`✅ ${rows.length} صف صالح.`);

  const { data: existing, error: fe } = await sb.from("products").select("id,legacy_id,is_published").not("legacy_id", "is", null);
  if (fe) throw fe;
  const byLegacy = new Map<number, { id: string; is_published: boolean }>();
  for (const p of existing ?? []) if (typeof p.legacy_id === "number") byLegacy.set(p.legacy_id, { id: p.id, is_published: !!p.is_published });

  let updated = 0, inserted = 0, republished = 0, hidden = 0;
  const seen = new Set<number>();
  const nowIso = new Date().toISOString();

  for (const r of rows) {
    seen.add(r.legacyId);
    const shouldPublish = r.stock > 0;
    const payload = {
      name: r.name, supplier_name: r.supplier, expiry_date: r.expiry,
      stock_qty: r.stock, price: r.price, track_stock: true,
      is_published: shouldPublish, updated_at: nowIso,
    };
    const found = byLegacy.get(r.legacyId);
    if (found) {
      const { error } = await sb.from("products").update(payload).eq("id", found.id);
      if (error) { console.error(`#${r.legacyId}:`, error.message); continue; }
      updated++;
      if (shouldPublish && !found.is_published) republished++;
    } else {
      const { error } = await sb.from("products").insert({ ...payload, legacy_id: r.legacyId, category: "أدوية", created_at: nowIso });
      if (error) { console.error(`#${r.legacyId}:`, error.message); continue; }
      inserted++;
    }
  }

  const toHide = [...byLegacy.entries()].filter(([k, v]) => !seen.has(k) && v.is_published).map(([, v]) => v.id);
  for (let i = 0; i < toHide.length; i += 500) {
    const slice = toHide.slice(i, i + 500);
    const { error } = await sb.from("products").update({ is_published: false, updated_at: nowIso }).in("id", slice);
    if (!error) hidden += slice.length;
  }

  console.log("──────── تقرير المزامنة ────────");
  console.log(`📊 الإجمالي: ${rows.length}`);
  console.log(`♻️  مُحدّث:    ${updated}`);
  console.log(`🆕 مُضاف:    ${inserted}`);
  console.log(`📢 أُعيد نشره: ${republished}`);
  console.log(`🙈 مُخفي:    ${hidden}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
