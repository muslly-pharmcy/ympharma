import { createFileRoute } from "@tanstack/react-router";
import { HeroTitans } from "@/components/titans/sections/HeroTitans";
import { FeaturesTitans } from "@/components/titans/sections/FeaturesTitans";
import { TestimonialsTitans } from "@/components/titans/sections/TestimonialsTitans";
import { PricingTitans } from "@/components/titans/sections/PricingTitans";
import { FooterTitans } from "@/components/titans/sections/FooterTitans";
import { CursorFollower } from "@/components/titans/motion/CursorFollower";

export const Route = createFileRoute("/titans")({
  head: () => ({
    meta: [
      { title: "المسلي Titans — تجربة صحية استثنائية" },
      {
        name: "description",
        content:
          "منصة المسلي Titans: وصفات طبية ذكية، توصيل سريع، وذكاء اصطناعي يفهم احتياجك.",
      },
      { property: "og:title", content: "المسلي Titans — تجربة صحية استثنائية" },
      {
        property: "og:description",
        content: "وصفات طبية ذكية وتوصيل سريع مع تجربة فاخرة.",
      },
    ],
  }),
  component: TitansLanding,
});

function TitansLanding() {
  return (
    <main className="titans-scope min-h-screen">
      <CursorFollower />
      <FeaturesTitans />
      <TestimonialsTitans />
      <PricingTitans />
      <FooterTitans />
    </main>
  );
}
