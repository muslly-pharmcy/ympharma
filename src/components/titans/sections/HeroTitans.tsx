import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { GradientText } from "../ui/GradientText";
import { Reveal } from "../motion/Reveal";
import { CountUp } from "../motion/CountUp";

export function HeroTitans() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--primary) 25%, transparent), transparent 70%)",
        }}
      />
      <div className="container mx-auto px-6 pt-24 pb-20 md:pt-32 md:pb-28 text-center relative">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/40 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--titans-gold)]" />
            Titans Edition — منصة المسلي
          </span>
        </Reveal>

        <Reveal delay={0.1}>
          <h1 className="mt-6 text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
            صحتك تستحق <GradientText>تجربة استثنائية</GradientText>
          </h1>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mx-auto mt-6 max-w-2xl text-base md:text-lg text-muted-foreground">
            وصفات طبية ذكية، توصيل سريع، وذكاء اصطناعي يفهم احتياجك — كل ذلك من مكان واحد.
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="rounded-full px-8">
              <Link to="/products">تصفح المنتجات</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-8">
              <Link to="/prescription">رفع وصفة طبية</Link>
            </Button>
          </div>
        </Reveal>

        <Reveal delay={0.4}>
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-2xl mx-auto">
            {[
              { label: "عميل سعيد", to: 12500, suffix: "+" },
              { label: "وصفة معالجة", to: 48000, suffix: "+" },
              { label: "دقة الذكاء", to: 99, suffix: "%" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl md:text-4xl font-bold">
                  <GradientText>
                    <CountUp to={s.to} suffix={s.suffix} />
                  </GradientText>
                </div>
                <div className="mt-1 text-xs md:text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
