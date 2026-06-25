// src/components/titans/TestimonialsTitans.tsx
import { GlassCard } from "@/components/titans/ui/GlassCard";
import { GradientText } from "@/components/titans/ui/GradientText";

const testimonials = [
  { name: "د. سارة", role: "صيدلانية", text: "منصة سهلة ودقيقة وفّرت علينا ساعات يومياً." },
  { name: "أحمد", role: "عميل", text: "وصلتني الوصفة بسرعة والخدمة ممتازة." },
  { name: "د. خالد", role: "طبيب", text: "أفضل تجربة رقمية للصيدلة جربتها." },
];

export function TestimonialsTitans() {
  return (
    <section className="py-20 px-4" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          <GradientText>آراء عملائنا</GradientText>
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <GlassCard key={i}>
              <p className="text-base mb-4">"{t.text}"</p>
              <div className="text-sm font-semibold">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.role}</div>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
