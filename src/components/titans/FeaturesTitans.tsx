import { Reveal } from "./motion/Reveal";
import { GlassCard } from "./ui/GlassCard";
import { GradientText } from "./ui/GradientText";
import { Brain, Truck, ShieldCheck, Clock, Sparkles, HeartPulse } from "lucide-react";

const features = [
  { icon: Brain, title: "صيدلي ذكي", desc: "تحليل فوري للوصفات الطبية بالذكاء الاصطناعي." },
  { icon: Truck, title: "توصيل سريع", desc: "خلال ساعات إلى باب منزلك في صنعاء." },
  { icon: ShieldCheck, title: "أمان كامل", desc: "بياناتك محمية بأعلى معايير التشفير." },
  { icon: Clock, title: "متاح 24/7", desc: "اطلب وتابع طلبك في أي وقت." },
  { icon: Sparkles, title: "خصومات ذكية", desc: "عروض تلقائية بناءً على احتياجك." },
  { icon: HeartPulse, title: "متابعة صحية", desc: "تذكير بمواعيد الأدوية المزمنة." },
];

export function FeaturesTitans() {
  return (
    <section className="container mx-auto px-6 py-20 md:py-28">
      <Reveal>
        <h2 className="text-3xl md:text-5xl font-bold text-center">
          لماذا <GradientText>المسلي</GradientText>؟
        </h2>
      </Reveal>
      <Reveal delay={0.1}>
        <p className="mt-4 max-w-xl mx-auto text-center text-muted-foreground">
          ست ميزات تجعل تجربتك الصحية أبسط وأذكى.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <Reveal key={f.title} delay={0.05 * i}>
            <GlassCard className="h-full">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </GlassCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
