import { createFileRoute } from "@tanstack/react-router";
import { HeroTitans } from "@/components/titans/HeroTitans";
import { FeaturesTitans } from "@/components/titans/FeaturesTitans";
import { PricingTitans } from "@/components/titans/PricingTitans";
import { FooterTitans } from "@/components/titans/FooterTitans";

export const Route = createFileRoute("/titans")({
  head: () => ({
    meta: [
      { title: "المسلي Titans — تجربة صحية استثنائية" },
      {
        name: "description",
        content: "منصة المسلي Titans: وصفات ذكية، توصيل سريع، وذكاء اصطناعي يفهم احتياجك.",
      },
      { property: "og:title", content: "المسلي Titans" },
      {
        property: "og:description",
        content: "تجربة صيدلية رقمية متكاملة في اليمن.",
      },
    ],
  }),
  component: TitansPage,
});

function TitansPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <HeroTitans />
      <FeaturesTitans />
      <PricingTitans />
      <FooterTitans />
    </main>
  );
}
