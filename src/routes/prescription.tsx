import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FileText, Upload, X, MessageCircle, CheckCircle2, Camera, Loader2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { openWhatsApp, WHATSAPP_NUMBER, buildPrescriptionMessage } from "@/lib/whatsapp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";

export const Route = createFileRoute("/prescription")({
  head: () => ({
    meta: [
      { title: "ارفع الروشتة — صيدلية المصلي" },
      { name: "description", content: "صوّر روشتتك الطبية وارفعها بسهولة، نجهّز أدويتك تلقائياً ونرسل تأكيد الطلب عبر واتساب." },
      { property: "og:title", content: "ارفع روشتتك واستلم أدويتك — صيدلية المصلي" },
      { property: "og:description", content: "خدمة رفع الروشتة الطبية عبر الموقع مع تجهيز سريع وتأكيد عبر واتساب." },
      { property: "og:url", content: "https://muslly.com/prescription" },
    ],
    links: [{ rel: "canonical", href: "https://muslly.com/prescription" }],
  }),
  component: PrescriptionPage,
});

type UploadStage = "idle" | "compressing" | "uploading" | "signing" | "done" | "error";
type FileItem = { file: File; url: string; stage: UploadStage; error?: string };

function stageLabel(s: UploadStage) {
  switch (s) {
    case "compressing": return "ضغط الصورة...";
    case "uploading": return "رفع الصورة...";
    case "signing": return "إنشاء الرابط...";
    case "done": return "تم ✓";
    case "error": return "فشل ✗";
    default: return "بانتظار الرفع";
  }
}
function stageProgress(s: UploadStage) {
  switch (s) {
    case "compressing": return 25;
    case "uploading": return 60;
    case "signing": return 85;
    case "done": return 100;
    case "error": return 100;
    default: return 0;
  }
}

function PrescriptionPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => {
      const seen = new Set(prev.map((p) => `${p.file.name}-${p.file.size}-${p.file.lastModified}`));
      const next = [...prev];
      for (const file of Array.from(list)) {
        if (next.length >= 5) break;
        if (!file.type.startsWith("image/")) { toast.error("يسمح بالصور فقط"); continue; }
        if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: الحجم أكبر من 10MB`); continue; }
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (seen.has(key)) continue;
        seen.add(key);
        next.push({ file, url: URL.createObjectURL(file), stage: "idle" });
      }
      return next;
    });
  }

  function removeFile(i: number) {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, idx) => idx !== i);
    });
  }

  function updateStage(i: number, stage: UploadStage, error?: string) {
    setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, stage, error } : f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return toast.error("الرجاء إرفاق صورة الروشتة");
    if (!name.trim() || !phone.trim() || !address.trim()) return toast.error("الرجاء تعبئة بياناتك");

    setBusy(true);
    setFiles((prev) => prev.map((f) => ({ ...f, stage: "idle", error: undefined })));
    try {
      const refId = "RX-" + Date.now().toString(36).toUpperCase().slice(-6);
      const folder = refId.toLowerCase();
      const uploadedUrls: string[] = [];

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      async function withRetry<T>(label: string, fn: () => Promise<T>, max = 3): Promise<T> {
        let lastErr: unknown;
        for (let attempt = 1; attempt <= max; attempt++) {
          try { return await fn(); } catch (e) {
            lastErr = e;
            console.warn(`[${label}] attempt ${attempt} failed`, e);
            if (attempt < max) await sleep(600 * attempt);
          }
        }
        throw lastErr;
      }

      for (let i = 0; i < files.length; i++) {
        const original = files[i].file;
        updateStage(i, "compressing");
        let f = original;
        try { f = await compressImage(original, { maxWidth: 1600, maxHeight: 1600, quality: 0.82 }); } catch { /* keep original */ }
        const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${folder}/${i + 1}-${Date.now()}.${ext}`;
        updateStage(i, "uploading");
        try {
          await withRetry(`upload#${i + 1}`, async () => {
            const { error } = await supabase.storage.from("prescriptions").upload(path, f, {
              contentType: f.type || "image/jpeg",
              upsert: false,
            });
            if (error) throw error;
          });
        } catch (e: any) {
          console.error("[storage.upload]", e);
          updateStage(i, "error", e?.message || "فشل الرفع");
          toast.error(`فشل رفع الصورة ${i + 1} بعد عدة محاولات`);
          setBusy(false);
          return;
        }
        updateStage(i, "signing");
        let signedUrl = "";
        try {
          signedUrl = await withRetry(`sign#${i + 1}`, async () => {
            const { data, error } = await supabase.storage.from("prescriptions").createSignedUrl(path, 60 * 60 * 24 * 30);
            if (error || !data?.signedUrl) throw error || new Error("no signed url");
            return data.signedUrl;
          });
        } catch (e: any) {
          console.error("[storage.signedUrl]", e);
          updateStage(i, "error", e?.message || "فشل التوقيع");
          toast.error("فشل إنشاء رابط الصورة");
          setBusy(false);
          return;
        }
        uploadedUrls.push(signedUrl);
        updateStage(i, "done");
      }

      const customer = { name: name.trim(), phone: phone.trim(), address: address.trim(), notes: notes.trim() || undefined };

      const { error: insErr } = await supabase.from("prescriptions").insert({
        id: refId,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_address: customer.address,
        notes: customer.notes ?? null,
        image_urls: uploadedUrls,
        status: "pending",
      });
      if (insErr) {
        console.error("[prescriptions.insert]", insErr);
        toast.error("فشل حفظ الطلب، حاول مجدداً");
        setBusy(false);
        return;
      }

      const msg = buildPrescriptionMessage({ refId, imageUrls: uploadedUrls, customer });
      openWhatsApp(msg);
      setSent(true);
      toast.success(`تم رفع الروشتة (${refId}) وفتح واتساب`);
    } finally {
      setBusy(false);
    }
  }

  const overallProgress = files.length === 0 ? 0
    : Math.round(files.reduce((acc, f) => acc + stageProgress(f.stage), 0) / files.length);


  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="rounded-3xl bg-gradient-to-l from-emerald-500 to-emerald-600 p-6 text-white shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20 backdrop-blur"><FileText className="size-6" /></div>
            <div>
              <h1 className="text-2xl font-black">ارفع روشتتك</h1>
              <p className="text-sm text-white/85">ترفع صور الروشتة، تنحفظ بالسحابة، وتُرسل تلقائياً مع رسالة واتساب جاهزة.</p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-card">
          <div>
            <p className="mb-2 text-sm font-black">صور الروشتة (حد أقصى 5)</p>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              className="grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-8 text-center transition hover:bg-primary/10"
            >
              <div className="grid size-14 place-items-center rounded-2xl brand-gradient text-primary-foreground shadow-card animate-bounce">
                <Upload className="size-6" />
              </div>
              <p className="mt-3 text-sm font-black">اضغط لاختيار الصور أو اسحبها هنا</p>
              <p className="text-xs text-muted-foreground">PNG / JPG — يمكنك التقاط الصورة من الكاميرا مباشرة</p>
              <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
            </div>

            {files.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {files.map((f, i) => {
                  const pct = stageProgress(f.stage);
                  const active = busy && f.stage !== "done" && f.stage !== "error";
                  return (
                    <div key={i} className="group relative overflow-hidden rounded-xl border border-border animate-in zoom-in">
                      <img src={f.url} alt={`صورة الروشتة الطبية المرفوعة ${i + 1}`} loading="lazy" decoding="async"
                        className={`aspect-square w-full object-cover transition ${active ? "opacity-60" : "opacity-100"}`} />
                      {active && <div className="absolute inset-0 animate-pulse bg-black/10" />}
                      {f.stage !== "idle" && (
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1.5 text-[10px] font-black text-white">
                          <div className="flex items-center justify-between">
                            <span>{stageLabel(f.stage)}</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/25">
                            <div
                              className={`h-full transition-all ${f.stage === "error" ? "bg-rose-400" : f.stage === "done" ? "bg-emerald-400" : "bg-primary"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {!busy && (
                        <button type="button" aria-label={`حذف الصورة ${i + 1}`} onClick={() => removeFile(i)}
                          className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100">
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {busy && files.length > 0 && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center justify-between text-xs font-black text-primary-deep">
                <span>جارٍ رفع {files.length} صورة...</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/15">
                <div className="h-full bg-primary transition-all" style={{ width: `${overallProgress}%` }} />
              </div>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الكامل" className="rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary" />
            <input required value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="رقم الجوال" className="rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <input required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="العنوان للتوصيل" className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="ملاحظات (مثلاً: حساسية، بدائل...) " className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary" />

          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3.5 text-sm font-black text-white shadow-elevated transition hover:scale-[1.02] disabled:opacity-60">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <MessageCircle className="size-5" />}
            {busy ? "جارٍ رفع الصور..." : "إرسال الروشتة عبر واتساب"}
          </button>

          {sent && (
            <div className="flex items-start gap-2 rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-700 animate-in fade-in">
              <CheckCircle2 className="size-4 shrink-0" />
              <p>تم رفع الروشتة وإرسال الرسالة على الرقم <strong dir="ltr">+{WHATSAPP_NUMBER}</strong>. سيتواصل معك فريقنا قريباً.</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Camera className="size-3.5" /> تأكّد من وضوح الصورة وكتابة الاسم بوضوح
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
