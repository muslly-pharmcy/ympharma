import { Reveal } from "./motion/Reveal";
import { GlassCard } from "./ui/GlassCard";
import { GoldenBorder } from "./ui/GoldenBorder";
import { GradientText } from "./ui/GradientText";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "@tanstack/react-router";

const plans = [
  {
    name: "أساسي",
    price: "مجاناً",
    features: ["تصفح المنتجات", "رفع وصفة طبية", "توصيل عادي"],
    cta: "ابدأ الآن",
    highlight: false,
  },
  {
    name: "Titans",
    price: "9,900",
    suffix: "ر.ي / شهر",
    features: ["توصيل مجاني", "أولوية المراجعة", "خصم 15% دائم", "صيدلي ذكي خاص"],
    cta: "ترقية إلى Titans",
    highlight: true,
  },
  {
    name: "العائلة",
    price: "24,900",
    suffix: "ر.ي / شهر",
    features: ["كل ميزات Titans", "حتى 5 أفراد", "تقرير صحي شهري"],
    cta: "احصل عليها",
    highlight: false,
  },
];

export function PricingTitans() {
  return (
    <section className="container mx-auto px-6 py-20 md:py-28">
      <Reveal>
        <h2 className="text-3xl md:text-5xl font-bold text-center">
          خطط <GradientText>تناسب الجميع</GradientText>
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
        {plans.map((p, i) => {
          const Card = (
            <div className="flex h-full flex-col p-8">
              <div className="text-sm text-muted-foreground">{p.name}</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-bold">
                  {p.highlight ? <GradientText>{p.price}</GradientText> : p.price}
                </span>
                {p.suffix && <span className="text-xs text-muted-foreground">{p.suffix}</span>}
              </div>
              <ul className="mt-6 space-y-3 text-sm flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-8 rounded-full"
                variant={p.highlight ? "default" : "outline"}
              >
                <Link to="/products">{p.cta}</Link>
              </Button>
            </div>
          );

          return (
            <Reveal key={p.name} delay={0.08 * i}>
              {p.highlight ? (
                <GoldenBorder className="h-full">{Card}</GoldenBorder>
              ) : (
                <GlassCard className="h-full p-0">{Card}</GlassCard>
              )}
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
