import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/unsubscribe")({
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const [state, setState] = useState<"loading" | "valid" | "invalid" | "already" | "done" | "error">("loading");
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token") || "";
    setToken(t);
    if (!t) { setState("invalid"); return; }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
      .then(r => r.json())
      .then(d => {
        if (d.valid) setState("valid");
        else if (d.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, []);

  const confirm = async () => {
    try {
      const r = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = await r.json();
      setState(d.success ? "done" : d.reason === "already_unsubscribed" ? "already" : "error");
    } catch { setState("error"); }
  };

  return (
    <div dir="rtl" className="mx-auto max-w-md p-6 text-center space-y-4">
      <h1 className="text-2xl font-black">إلغاء الاشتراك</h1>
      {state === "loading" && <p>جارٍ التحقق…</p>}
      {state === "invalid" && <p className="text-rose-600">رابط غير صالح أو منتهي.</p>}
      {state === "already" && <p className="text-emerald-600">تم إلغاء اشتراكك مسبقًا.</p>}
      {state === "valid" && (
        <>
          <p>هل تريد إلغاء اشتراكك من رسائلنا؟</p>
          <button onClick={confirm} className="brand-gradient rounded-xl px-6 py-3 font-black text-primary-foreground">تأكيد الإلغاء</button>
        </>
      )}
      {state === "done" && <p className="text-emerald-600">تم إلغاء اشتراكك بنجاح.</p>}
      {state === "error" && <p className="text-rose-600">حدث خطأ. حاول لاحقًا.</p>}
    </div>
  );
}
