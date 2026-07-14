// Phoenix Invoice Intelligence — mobile-first upload page
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  createInvoiceUpload,
} from "@/modules/invoice-intake/functions/upload.functions";
import { extractInvoice } from "@/modules/invoice-intake/functions/extract.functions";

export const Route = createFileRoute("/_authenticated/pharmacist/invoice-upload")({
  head: () => ({
    meta: [
      { title: "رفع فاتورة مورد | Muslly Pharmacy" },
      { name: "description", content: "ارفع صورة فاتورة المورد لاستخراج المنتجات تلقائياً" },
    ],
  }),
  component: InvoiceUploadPage,
});

function InvoiceUploadPage() {
  const navigate = useNavigate();
  const createFn = useServerFn(createInvoiceUpload);
  const extractFn = useServerFn(extractInvoice);
  const [orgId, setOrgId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  async function handleUpload() {
    if (!file) { toast.error("اختر صورة أولاً"); return; }
    if (!orgId) { toast.error("أدخل رقم المؤسسة"); return; }
    setBusy(true);
    try {
      setProgress("جارٍ إنشاء السجل...");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const created = await createFn({
        data: {
          organization_id: orgId,
          mime_type: file.type || "image/jpeg",
          source: "camera",
          file_ext: ext,
        },
      });

      setProgress("جارٍ رفع الصورة...");
      const up = await supabase.storage
        .from("invoice-uploads")
        .uploadToSignedUrl(created.storage_path, created.token, file, {
          contentType: file.type,
        });
      if (up.error) throw up.error;

      setProgress("جارٍ استخراج البيانات بالذكاء الاصطناعي...");
      await extractFn({ data: { upload_id: created.upload_id } });

      toast.success("تم استخراج الفاتورة — راجع البنود");
      navigate({
        to: "/pharmacist/invoice-review/$id",
        params: { id: created.upload_id },
      });
    } catch (e) {
      toast.error(`فشل: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <div className="mx-auto max-w-lg p-4 space-y-4" dir="rtl">
      <h1 className="text-2xl font-bold">رفع فاتورة مورد</h1>
      <p className="text-sm text-muted-foreground">
        صوّر الفاتورة أو ارفعها. سنستخرج المنتجات، ثم تراجعها قبل تحديث المخزون.
      </p>

      <div className="space-y-2">
        <label className="text-sm font-medium">رقم المؤسسة (Organization ID)</label>
        <Input
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          placeholder="UUID"
          dir="ltr"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">صورة الفاتورة</label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm rounded-md border p-2"
          style={{ minHeight: 44 }}
        />
        {file && (
          <p className="text-xs text-muted-foreground">
            {file.name} — {(file.size / 1024).toFixed(0)} KB
          </p>
        )}
      </div>

      <Button
        onClick={handleUpload}
        disabled={busy || !file || !orgId}
        className="w-full h-12 text-base"
      >
        {busy ? progress || "..." : "ارفع وابدأ الاستخراج"}
      </Button>

      <div className="pt-4 border-t">
        <Link
          to="/pharmacist/invoice-list"
          className="text-sm text-primary underline"
        >
          عرض الفواتير السابقة
        </Link>
      </div>
    </div>
  );
}
