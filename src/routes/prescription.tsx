import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FileText, Upload, X, MessageCircle, CheckCircle2, Camera, Loader2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { openWhatsApp, WHATSAPP_NUMBER, buildPrescriptionMessage } from "@/lib/whatsapp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/prescription")({
  head: () => ({ meta: [{ title: "ارفع الروشتة — صيدلية المصلي" }] }),
  component: PrescriptionPage,
});

function PrescriptionPage() {
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).slice(0, 5).map((file) => ({ file, url: URL.createObjectURL(file) }));
    setFiles((prev) => [...prev, ...arr].slice(0, 5));
  }

  function removeFile(i: number) {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, idx) => idx !== i);
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return toast.error("الرجاء إرفاق صورة الروشتة");
    if (!name.trim() || !phone.trim() || !address.trim()) return toast.error("الرجاء تعبئة بياناتك");

    setBusy(true);
    try {
      const refId = "RX-" + Date.now().toString(36).toUpperCase().slice(-6);
      const folder = refId.toLowerCase();
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const f = files[i].file;
        const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${folder}/${i + 1}-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("prescriptions").upload(path, f, {
          contentType: f.type || "image/jpeg",
          upsert: false,
        });
        if (error) {
          console.error("[storage.upload]", error);
          toast.error("فشل رفع صورة الروشتة");
          setBusy(false);
          return;
        }
        // Signed URL valid 30 days so admin (or WhatsApp recipient) can open it.
        const { data: signed } = await supabase.storage.from("prescriptions").createSignedUrl(path, 60 * 60 * 24 * 30);
        if (signed?.signedUrl) uploadedUrls.push(signed.signedUrl);
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
      if (insErr) console.error("[prescriptions.insert]", insErr);

      const msg = buildPrescriptionMessage({ refId, imageUrls: uploadedUrls, customer });
      openWhatsApp(msg);
      setSent(true);
      toast.success(`تم رفع الروشتة (${refId}) وفتح واتساب`);
    } finally {
      setBusy(false);
    }
  }

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
                {files.map((f, i) => (
                  <div key={i} className="group relative overflow-hidden rounded-xl border border-border animate-in zoom-in">
                    <img src={f.url} alt="روشتة" className="aspect-square w-full object-cover" />
                    <button type="button" onClick={() => removeFile(i)} className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100">
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
