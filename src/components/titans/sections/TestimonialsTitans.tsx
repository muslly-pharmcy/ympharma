import { GlassCard } from "../ui/GlassCard";
import { GradientText } from "../ui/GradientText";
import { Reveal } from "../motion/Reveal";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "د. سارة العمري",
    role: "صيدلانية",
    text: "منصة سهلة ودقيقة وفّرت علينا ساعات يومياً. الذكاء الاصطناعي يحلل الوصفات بدقة مذهلة.",
    rating: 5,
  },
  {
    name: "أحمد السبيعي",
    role: "عميل",
    text: "وصلتني الوصفة بسرعة والخدمة ممتازة. أوصي بها لكل من يبحث عن الراحة والسرعة.",
    rating: 5,
  },
  {
    name: "د. خالد الزهراني",
    role: "طبيب",
    text: "أفضل تجربة رقمية للصيدلة جربتها. تواصل سلس بين الأطباء والصيادلة والمرضى.",
    rating: 4,
  },
];

export function TestimonialsTitans() {
  return (
    <section className="container mx-auto px-6 py-20 md:py-28" dir="rtl">
      <Reveal>
        <h2 className="text-3xl md:text-5xl font-bold text-center">
          <GradientText>آراء عملائنا</GradientText>
        </h2>
      </Reveal>
      <Reveal delay={0.1}>
        <p className="mt-4 max-w-xl mx-auto text-center text-muted-foreground">
          ماذا يقول عملاؤنا عن تجربتهم مع منصة المسلي
        </p>
      </Reveal>

      <div className="mt-14 grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
        {testimonials.map((t, i) => (
          <Reveal key={t.name} delay={0.08 * i}>
            <GlassCard className="h-full">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={
                      j < t.rating
                        ? "h-4 w-4 fill-[color:var(--titans-gold)] text-[color:var(--titans-gold)]"
                        : "h-4 w-4 text-muted-foreground/40"
                    }
                  />
                ))}
              </div>
              <p className="text-base mb-4 leading-relaxed">"{t.text}"</p>
              <div className="text-sm font-semibold">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.role}</div>
            </GlassCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
