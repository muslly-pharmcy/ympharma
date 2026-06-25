// src/routes/titans.tsx
import { createFileRoute } from "@tanstack/react-router";
import { HeroTitans } from "@/components/sections/HeroTitans";
import { FeaturesTitans } from "@/components/sections/FeaturesTitans";
import { TestimonialsTitans } from "@/components/sections/TestimonialsTitans";
import { PricingTitans } from "@/components/sections/PricingTitans";
import { FooterTitans } from "@/components/sections/FooterTitans";

export const Route = createFileRoute("/titans")({
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
