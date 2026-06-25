import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Mail, Phone, MapPin, Send, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تواصل معنا — المسلي" },
      {
        name: "description",
        content:
          "تواصل مع فريق المسلي للاستفسارات والدعم الفني وطلبات الشراكة. نرد عليك خلال 24 ساعة.",
      },
      { property: "og:title", content: "تواصل معنا — المسلي" },
      {
        property: "og:description",
        content: "نموذج تواصل مباشر مع فريق المسلي.",
      },
    ],
  }),
  component: ContactPage,
});

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "الاسم قصير جداً" })
    .max(100, { message: "الاسم طويل جداً" }),
  email: z
    .string()
    .trim()
    .email({ message: "بريد إلكتروني غير صالح" })
    .max(255),
  message: z
    .string()
    .trim()
    .min(10, { message: "الرسالة قصيرة جداً (10 أحرف على الأقل)" })
    .max(1000, { message: "الرسالة طويلة جداً" }),
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    // Simple mailto fallback — no backend write
    const subject = encodeURIComponent(`رسالة من ${parsed.data.name}`);
    const body = encodeURIComponent(
      `${parsed.data.message}\n\n— ${parsed.data.name} (${parsed.data.email})`,
    );
    window.location.href = `mailto:hello@muslly.com?subject=${subject}&body=${body}`;
    setTimeout(() => {
      setSubmitting(false);
      toast.success("تم فتح بريدك لإرسال الرسالة ✉️");
      setForm({ name: "", email: "", message: "" });
    }, 600);
  };

  return (
    <main className="min-h-screen bg-background">
      <section className="container mx-auto px-6 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            تواصل معنا
          </h1>
          <p className="mt-4 text-muted-foreground">
            نسعد بأسئلتك واقتراحاتك — راسلنا وسنرد خلال 24 ساعة.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <aside className="md:col-span-1 space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/40 p-4">
              <Mail className="text-primary mt-0.5" />
              <div>
                <div className="text-sm font-medium">البريد</div>
                <a
                  href="mailto:hello@muslly.com"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  hello@muslly.com
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/40 p-4">
              <Phone className="text-primary mt-0.5" />
              <div>
                <div className="text-sm font-medium">الهاتف</div>
                <div className="text-sm text-muted-foreground">+967 770 000 000</div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/40 p-4">
              <MapPin className="text-primary mt-0.5" />
              <div>
                <div className="text-sm font-medium">العنوان</div>
                <div className="text-sm text-muted-foreground">صنعاء، اليمن</div>
              </div>
            </div>
          </aside>

          <form
            onSubmit={onSubmit}
            className="md:col-span-2 rounded-2xl border border-border/50 bg-card/40 p-6 md:p-8 space-y-5"
            noValidate
          >
            <div>
              <Label htmlFor="name">الاسم</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={100}
                className="mt-2"
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-destructive">{errors.name}</p>
              )}
            </div>
            <div>
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                maxLength={255}
                className="mt-2"
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-destructive">{errors.email}</p>
              )}
            </div>
            <div>
              <Label htmlFor="message">الرسالة</Label>
              <Textarea
                id="message"
                rows={6}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                maxLength={1000}
                className="mt-2"
                aria-invalid={!!errors.message}
              />
              {errors.message && (
                <p className="mt-1 text-xs text-destructive">{errors.message}</p>
              )}
            </div>
            <div className="flex items-center justify-between gap-4">
              <Button asChild variant="ghost">
                <Link to="/titans">
                  <ArrowRight className="rotate-180" />
                  العودة
                </Link>
              </Button>
              <Button type="submit" disabled={submitting}>
                <Send />
                {submitting ? "جارٍ الإرسال..." : "إرسال الرسالة"}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
