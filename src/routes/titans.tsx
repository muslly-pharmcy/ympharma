// src/routes/titans.tsx
import { createFileRoute } from "@tanstack/react-router";
import { HeroTitans } from "@/components/titans/HeroTitans";
import { FeaturesTitans } from "@/components/titans/FeaturesTitans";
import { TestimonialsTitans } from "@/components/titans/TestimonialsTitans";
import { PricingTitans } from "@/components/titans/PricingTitans";
import { FooterTitans } from "@/components/titans/FooterTitans";

export const Route = createFileRoute("/titans")({
  head: () => ({
    meta: [
      { title: "المسلي Titans — تجربة صحية استثنائية" },
      { name: "description", content: "منصة المسلي Titans: وصفات ذكية، توصيل سريع، وذكاء اصطناعي." },
    ],
  }),
  component: TitansLanding,
});

function TitansLanding() {
  return (
    <main className="min-h-screen bg-background">
      <HeroTitans />
      <FeaturesTitans />
      <TestimonialsTitans />
      <PricingTitans />
      <FooterTitans />
    </main>
  );
}
