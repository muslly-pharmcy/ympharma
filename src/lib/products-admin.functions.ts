import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(300),
  brand: z.string().trim().max(120).optional().nullable(),
  price: z.number().min(0),
  old_price: z.number().min(0).optional().nullable(),
  category: z.string().trim().min(1).max(80),
  image_url: z.string().trim().max(2000).optional().nullable(),
  badge: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  is_published: z.boolean().optional(),
});

async function assertPerm(supabase: any, userId: string, perm: "products" | "pricing") {
  const [{ data: owner }, { data: perms }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "owner").maybeSingle(),
    supabase.from("staff_permissions").select("permission").eq("user_id", userId),
  ]);
  if (owner) return;
  const list = ((perms ?? []) as { permission: string }[]).map((p) => p.permission);
  if (!list.includes(perm)) throw new Error(`ليست لديك صلاحية: ${perm}`);
}

export const listAllProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPerm(context.supabase, context.userId, "products").catch(async () => {
      await assertPerm(context.supabase, context.userId, "pricing");
    });
    const { data, error } = await context.supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => productSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Allow pricing-only users to update price fields only
    let pricingOnly = false;
    try { await assertPerm(context.supabase, context.userId, "products"); }
    catch { await assertPerm(context.supabase, context.userId, "pricing"); pricingOnly = true; }

    if (pricingOnly && !data.id) throw new Error("صلاحية الأسعار لا تسمح بإنشاء أصناف جديدة");

    const payload: any = pricingOnly
      ? { price: data.price, old_price: data.old_price ?? null, badge: data.badge ?? null }
      : {
          name: data.name, brand: data.brand ?? null, price: data.price,
          old_price: data.old_price ?? null, category: data.category,
          image_url: data.image_url ?? null, badge: data.badge ?? null,
          description: data.description ?? null,
          is_published: data.is_published ?? true,
        };

    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("products").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("products").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPerm(context.supabase, context.userId, "products");
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const bulkSchema = z.object({
  rows: z.array(productSchema.omit({ id: true })).min(1).max(2000),
  replace: z.boolean().optional(),
});

export const bulkImportProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bulkSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertPerm(context.supabase, context.userId, "products");
    if (data.replace) {
      const { error } = await context.supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw new Error(error.message);
    }
    const payload = data.rows.map((r) => ({
      name: r.name, brand: r.brand ?? null, price: r.price,
      old_price: r.old_price ?? null, category: r.category,
      image_url: r.image_url ?? null, badge: r.badge ?? null,
      description: r.description ?? null,
      is_published: r.is_published ?? true,
    }));
    const { error, count } = await context.supabase.from("products").insert(payload, { count: "exact" });
    if (error) throw new Error(error.message);
    return { inserted: count ?? payload.length };
  });

// Fetch a public Google Sheet (CSV export) and import.
// URL must be the sheet id or a full /spreadsheets/d/{id}/... URL with public "Anyone with link" view.
export const importFromGoogleSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    sheetUrl: z.string().min(10),
    replace: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPerm(context.supabase, context.userId, "products");
    const m = data.sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const id = m ? m[1] : data.sheetUrl.trim();
    const gidMatch = data.sheetUrl.match(/[#&?]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : "0";
    const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
    const res = await fetch(csvUrl);
    if (!res.ok) throw new Error(`تعذّر قراءة الشيت (${res.status}). تأكد أنه مشارك للعموم.`);
    const text = await res.text();
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error("الشيت فارغ");
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (k: string) => header.indexOf(k);
    const iName = idx("name"), iBrand = idx("brand"), iPrice = idx("price"),
      iOld = idx("old_price"), iCat = idx("category"), iImg = idx("image_url"),
      iBadge = idx("badge"), iDesc = idx("description");
    if (iName < 0 || iPrice < 0 || iCat < 0) {
      throw new Error("الأعمدة المطلوبة: name, price, category (وأعمدة اختيارية: brand, old_price, image_url, badge, description)");
    }
    const parsed = rows.slice(1).filter((r) => r[iName]?.trim()).map((r) => ({
      name: r[iName].trim(),
      brand: iBrand >= 0 ? (r[iBrand] || "").trim() : "",
      price: Number((r[iPrice] || "0").replace(/[^\d.]/g, "")) || 0,
      old_price: iOld >= 0 && r[iOld] ? Number(r[iOld].replace(/[^\d.]/g, "")) || null : null,
      category: r[iCat].trim(),
      image_url: iImg >= 0 ? (r[iImg] || "").trim() : "",
      badge: iBadge >= 0 ? (r[iBadge] || "").trim() : "",
      description: iDesc >= 0 ? (r[iDesc] || "").trim() : "",
      is_published: true,
    }));
    if (data.replace) {
      await context.supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }
    const { error, count } = await context.supabase.from("products").insert(parsed, { count: "exact" });
    if (error) throw new Error(error.message);
    return { inserted: count ?? parsed.length };
  });

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === "\r") { /* skip */ }
      else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
