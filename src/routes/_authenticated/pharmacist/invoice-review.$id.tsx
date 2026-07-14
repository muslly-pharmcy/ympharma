// Phoenix Invoice Intelligence — review + commit page
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getInvoiceForReview } from "@/modules/invoice-intake/functions/upload.functions";
import {
  updateInvoiceLine,
  commitInvoice,
} from "@/modules/invoice-intake/functions/review.functions";

export const Route = createFileRoute("/_authenticated/pharmacist/invoice-review/$id")({
  head: () => ({ meta: [{ title: "مراجعة فاتورة | Muslly" }] }),
  component: InvoiceReviewPage,
});

function InvoiceReviewPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const getFn = useServerFn(getInvoiceForReview);
  const updateFn = useServerFn(updateInvoiceLine);
  const commitFn = useServerFn(commitInvoice);

  const [warehouseId, setWarehouseId] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["invoice-review", id],
    queryFn: () => getFn({ data: { upload_id: id } }),
  });

  async function updateLine(lineId: string, patch: Record<string, unknown>) {
    try {
      await updateFn({ data: { line_id: lineId, patch: patch as never } });
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleCommit() {
    if (!warehouseId) { toast.error("أدخل معرّف المستودع"); return; }
    try {
      const res = await commitFn({ data: { upload_id: id, warehouse_id: warehouseId } });
      toast.success(`تم إضافة ${res.committed} منتج للمخزون`);
      navigate({ to: "/pharmacist/invoice-list" });
    } catch (e) {
      toast.error(`فشل الترحيل: ${(e as Error).message}`);
    }
  }

  if (isLoading) return <div className="p-8 text-center" dir="rtl">جارٍ التحميل...</div>;
  if (!data) return <div className="p-8 text-center" dir="rtl">لا توجد بيانات</div>;

  const { upload, extraction, lines, image_url } = data;
  const status = (upload as { status: string }).status;
  const pending = lines.filter((l) => (l as { status: string }).status === "pending").length;

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">مراجعة الفاتورة</h1>
        <Badge>{status}</Badge>
      </div>

      {image_url && (
        <details className="border rounded-md p-2">
          <summary className="cursor-pointer text-sm">عرض صورة الفاتورة</summary>
          <img src={image_url} alt="Invoice" className="mt-2 max-h-96 mx-auto" />
        </details>
      )}

      {extraction && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm p-3 bg-muted rounded-md">
          <div><span className="text-muted-foreground">المورد:</span> {String((extraction as Record<string, unknown>).supplier_name_raw ?? "—")}</div>
          <div><span className="text-muted-foreground">رقم:</span> {String((extraction as Record<string, unknown>).invoice_number ?? "—")}</div>
          <div><span className="text-muted-foreground">التاريخ:</span> {String((extraction as Record<string, unknown>).invoice_date ?? "—")}</div>
          <div><span className="text-muted-foreground">الإجمالي:</span> {String((extraction as Record<string, unknown>).total ?? "—")} {String((extraction as Record<string, unknown>).currency ?? "")}</div>
          <div className="col-span-full text-xs text-muted-foreground">
            ثقة OCR: {Number((extraction as Record<string, unknown>).ocr_confidence ?? 0).toFixed(2)} · النموذج: {String((extraction as Record<string, unknown>).model_used ?? "—")}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="font-semibold">البنود ({lines.length}) — متبقٍ للمراجعة: {pending}</h2>
        {lines.map((raw) => {
          const l = raw as Record<string, string | number | boolean | null>;
          const lineId = String(l.id);
          const lineStatus = String(l.status);
          return (
            <div key={lineId} className="border rounded-md p-3 space-y-2 bg-card">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm space-y-1">
                  <div className="font-medium">#{String(l.line_no)} — {String(l.detected_name ?? "—")}</div>
                  <div className="text-xs text-muted-foreground">{String(l.raw_text ?? "")}</div>
                  <div className="text-xs">
                    ثقة المطابقة: {Number(l.match_confidence ?? 0).toFixed(2)} · مصدر: {String(l.match_source ?? "unmatched")}
                    {l.matched_product_id && <> · مطابق: <code className="text-[10px]">{String(l.matched_product_id).slice(0, 8)}</code></>}
                  </div>
                </div>
                <Badge variant={lineStatus === "confirmed" ? "default" : lineStatus === "skipped" ? "secondary" : "outline"}>
                  {lineStatus}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <label className="text-xs">
                  الكمية
                  <Input
                    type="number"
                    defaultValue={String(l.user_confirmed_qty ?? l.quantity ?? "")}
                    onBlur={(e) => updateLine(lineId, { user_confirmed_qty: Number(e.target.value) || null })}
                  />
                </label>
                <label className="text-xs">
                  السعر
                  <Input
                    type="number"
                    defaultValue={String(l.user_confirmed_cost ?? l.unit_cost ?? "")}
                    onBlur={(e) => updateLine(lineId, { user_confirmed_cost: Number(e.target.value) || null })}
                  />
                </label>
                <label className="text-xs">
                  الانتهاء
                  <Input
                    type="date"
                    defaultValue={String(l.user_confirmed_expiry ?? l.expiry_date ?? "")}
                    onBlur={(e) => updateLine(lineId, { user_confirmed_expiry: e.target.value || null })}
                  />
                </label>
                <label className="text-xs">
                  المنتج (UUID للتصحيح)
                  <Input
                    dir="ltr"
                    defaultValue={String(l.user_confirmed_product_id ?? l.matched_product_id ?? "")}
                    onBlur={(e) => updateLine(lineId, { user_confirmed_product_id: e.target.value || null })}
                    placeholder="اختياري"
                  />
                </label>
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={() => updateLine(lineId, { status: "confirmed" })}>تأكيد</Button>
                <Button size="sm" variant="secondary" onClick={() => updateLine(lineId, { status: "skipped" })}>تخطي</Button>
                <Button size="sm" variant="outline" onClick={() => updateLine(lineId, { status: "pending" })}>إعادة</Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 bg-background border-t p-3 space-y-2">
        <Input
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          placeholder="معرّف المستودع (UUID)"
          dir="ltr"
        />
        <Button
          className="w-full h-12"
          onClick={handleCommit}
          disabled={pending > 0 || status === "committed" || !warehouseId}
        >
          {status === "committed" ? "تم الترحيل" : pending > 0 ? `راجع ${pending} بنداً أولاً` : "تأكيد الكل وإضافة للمخزون"}
        </Button>
      </div>
    </div>
  );
}
