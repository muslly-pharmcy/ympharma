import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FileText, Upload, X, MessageCircle, CheckCircle2, Camera, Loader2, WifiOff, AlertTriangle, RotateCw, Signal } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { openWhatsApp, WHATSAPP_NUMBER, buildPrescriptionMessage } from "@/lib/whatsapp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";
import { RX_SIGNED_TTL_SECONDS } from "@/lib/rx-url";
import { isSlowNetwork, getNetQuality, onNetworkChange } from "@/lib/net-quality";
import {
  loadDraft, saveDraft, clearDraft,
  loadPending, savePending, clearPending,
  verifyUploaded, commitPending,
  type RxPending,
} from "@/lib/rx-pending";

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

type UploadStage = "idle" | "compressing" | "uploading" | "signing" | "verifying" | "done" | "error";
type FileItem = { file: File; url: string; stage: UploadStage; error?: string; signedUrl?: string };

function stageLabel(s: UploadStage) {
  switch (s) {
    case "compressing": return "ضغط الصورة...";
    case "uploading": return "رفع الصورة...";
    case "signing": return "إنشاء الرابط...";
    case "verifying": return "التحقق من الحفظ...";
    case "done": return "تم ✓";
    case "error": return "فشل ✗";
    default: return "بانتظار الرفع";
  }
}
function stageProgress(s: UploadStage) {
  switch (s) {
    case "compressing": return 20;
    case "uploading": return 55;
    case "signing": return 75;
    case "verifying": return 90;
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
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [slow, setSlow] = useState(false);
  const [netType, setNetType] = useState<string>("unknown");
  const [pending, setPending] = useState<RxPending | null>(null);
  const [recovering, setRecovering] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore draft + check for pending commit on mount
  useEffect(() => {
    const d = loadDraft();
    if (d) {
      setName(d.name || ""); setPhone(d.phone || ""); setAddress(d.address || ""); setNotes(d.notes || "");
    }
    const p = loadPending();
    if (p) {
      setPending(p);
      // Auto-retry committing once on mount if it failed before.
      if (p.stage === "committing") void recoverPending(p);
    }
    const onOn = () => setOnline(true);
    const onOff = () => setOnline(false);
    window.addEventListener("online", onOn);
    window.addEventListener("offline", onOff);
    const updateNet = () => { setSlow(isSlowNetwork()); setNetType(getNetQuality()); };
    updateNet();
    const offNet = onNetworkChange(updateNet);
    return () => {
      window.removeEventListener("online", onOn);
      window.removeEventListener("offline", onOff);
      offNet();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist text fields as draft (debounced via timeout)
  useEffect(() => {
    const t = setTimeout(() => {
      if (name || phone || address || notes) saveDraft({ name, phone, address, notes });
    }, 400);
    return () => clearTimeout(t);
  }, [name, phone, address, notes]);

  async function recoverPending(p: RxPending) {
    if (recovering) return;
    setRecovering(true);
    try {
      const res = await commitPending(p);
      if (res.ok) {
        const next: RxPending = { ...p, stage: "awaiting-whatsapp" };
        savePending(next);
        setPending(next);
        toast.success(`تمت استعادة الروشتة ${p.refId} وحفظها`);
      } else {
        const next: RxPending = { ...p, attempts: p.attempts + 1, lastError: res.error };
        savePending(next);
        setPending(next);
      }
    } finally { setRecovering(false); }
  }

  function reopenWhatsApp(p: RxPending) {
    const msg = buildPrescriptionMessage({ refId: p.refId, imageUrls: p.imageUrls, customer: p.customer });
    openWhatsApp(msg);
  }

  function dismissPending() {
    clearPending(); setPending(null);
  }

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

  function updateStage(i: number, stage: UploadStage, patch: Partial<FileItem> = {}) {
    setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, stage, ...patch } : f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return toast.error("الرجاء إرفاق صورة الروشتة");
    if (!name.trim() || !phone.trim() || !address.trim()) return toast.error("الرجاء تعبئة بياناتك");
    if (!online) return toast.error("لا يوجد اتصال بالإنترنت — حاول لاحقاً");

    setBusy(true);
    setFiles((prev) => prev.map((f) => ({ ...f, stage: "idle", error: undefined })));
    try {
      const refId = "RX-" + Date.now().toString(36).toUpperCase().slice(-6);
      // Path must start with "uploads/" to match storage RLS policy.
      const folder = `uploads/${refId.toLowerCase()}`;
      const uploadedUrls: string[] = [];

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const MAX_UPLOAD_ATTEMPTS = 5;
      async function withRetry<T>(label: string, fn: () => Promise<T>, max = MAX_UPLOAD_ATTEMPTS): Promise<T> {
        let lastErr: unknown;
        for (let attempt = 1; attempt <= max; attempt++) {
          try { return await fn(); } catch (e) {
            lastErr = e;
            console.warn(`[${label}] attempt ${attempt}/${max} failed`, e);
            if (attempt < max) {
              const delay = Math.min(8000, 600 * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 200);
              await sleep(delay);
            }
          }
        }
        throw lastErr;
      }

      for (let i = 0; i < files.length; i++) {
        const original = files[i].file;
        updateStage(i, "compressing");
        let f: File | Blob = original;
        try { f = await compressImage(original, { maxWidth: 1600, maxHeight: 1600, quality: 0.82 }); } catch { /* keep original */ }
        const ext = (original.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${folder}/${i + 1}-${Date.now()}.${ext}`;
        updateStage(i, "uploading");
        try {
          await withRetry(`upload#${i + 1}`, async () => {
            const { error } = await supabase.storage.from("prescriptions").upload(path, f, {
              contentType: (f as File).type || "image/jpeg",
              upsert: false,
            });
            if (error) throw error;
          });
        } catch (e: any) {
          console.error("[storage.upload]", e);
          updateStage(i, "error", { error: e?.message || "فشل الرفع" });
          toast.error(`فشل رفع الصورة ${i + 1} بعد ${MAX_UPLOAD_ATTEMPTS} محاولات`);
          setBusy(false);
          return;
        }
        updateStage(i, "signing");
        let signedUrl = "";
        try {
          await withRetry(`sign#${i + 1}`, async () => {
            const { data, error } = await supabase.storage
              .from("prescriptions")
              .createSignedUrl(path, RX_SIGNED_TTL_SECONDS);
            if (error) throw error;
            if (!data?.signedUrl) throw new Error("no signed url");
            signedUrl = data.signedUrl;
          });
        } catch (e: any) {
          console.error("[storage.createSignedUrl]", e);
          updateStage(i, "error", { error: e?.message || "فشل إنشاء الرابط" });
          toast.error("فشل إنشاء رابط الصورة");
          setBusy(false);
          return;
        }
        // Verify the file is actually retrievable from storage (catches partial uploads).
        updateStage(i, "verifying");
        const reachable = await verifyUploaded(signedUrl);
        if (!reachable) {
          updateStage(i, "error", { error: "تعذر التحقق من حفظ الصورة" });
          toast.error(`الصورة ${i + 1} لم يتم التحقق من حفظها — حاول مرة أخرى`);
          setBusy(false);
          return;
        }
        uploadedUrls.push(signedUrl);
        updateStage(i, "done", { signedUrl });
      }

      const customer = { name: name.trim(), phone: phone.trim(), address: address.trim(), notes: notes.trim() || undefined };

      // STEP: persist pending commit BEFORE inserting — if insert fails we still
      // have the uploaded URLs and can retry without re-uploading.
      const pendingEntry: RxPending = {
        refId, customer, imageUrls: uploadedUrls,
        stage: "committing", createdAt: Date.now(), attempts: 0,
      };
      savePending(pendingEntry);
      setPending(pendingEntry);

      const commit = await commitPending(pendingEntry);
      if (!commit.ok) {
        console.error("[prescriptions.insert]", commit.error);
        const next: RxPending = { ...pendingEntry, attempts: 1, lastError: commit.error };
        savePending(next);
        setPending(next);
        toast.error("فشل حفظ الطلب — سنعيد المحاولة تلقائياً، صورك محفوظة بالسحابة");
        setBusy(false);
        return;
      }

      // Mark as awaiting-whatsapp so the recovery banner can re-open WA if needed.
      const wa: RxPending = { ...pendingEntry, stage: "awaiting-whatsapp" };
      savePending(wa);
      setPending(wa);

      const msg = buildPrescriptionMessage({ refId, imageUrls: uploadedUrls, customer });
      openWhatsApp(msg);
      setSent(true);
      clearDraft();
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

        {!online && (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-800">
            <WifiOff className="size-4" />
            لا يوجد اتصال بالإنترنت — مسوّدتك محفوظة محلياً وستُستأنف عند عودة الاتصال.
          </div>
        )}

        {online && slow && (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs font-bold text-amber-800">
            <Signal className="size-4" />
            الشبكة بطيئة ({netType}) — سنقوم بضغط الصور تلقائياً وإعادة المحاولة عند الفشل. لا تغلق الصفحة.
          </div>
        )}

        {pending && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-5 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-black">
                  {pending.stage === "committing"
                    ? `روشتة بانتظار الحفظ في النظام (${pending.refId})`
                    : `روشتة جاهزة للإرسال عبر واتساب (${pending.refId})`}
                </p>
                <p className="mt-1 text-xs">
                  صور الروشتة محفوظة بالسحابة بنجاح ({pending.imageUrls.length} صورة).
                  {pending.lastError && <span className="block mt-1 text-rose-700" dir="ltr">خطأ: {pending.lastError}</span>}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {pending.stage === "committing" && (
                    <button
                      type="button"
                      onClick={() => recoverPending(pending)}
                      disabled={recovering || !online}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-60"
                    >
                      {recovering ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCw className="size-3.5" />}
                      إعادة المحاولة
                    </button>
                  )}
                  {pending.stage === "awaiting-whatsapp" && (
                    <button
                      type="button"
                      onClick={() => reopenWhatsApp(pending)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white"
                    >
                      <MessageCircle className="size-3.5" /> فتح واتساب
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={dismissPending}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-rose-700 border border-rose-200"
                  >
                    إخفاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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

          <button type="submit" disabled={busy || !online} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3.5 text-sm font-black text-white shadow-elevated transition hover:scale-[1.02] disabled:opacity-60">
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
