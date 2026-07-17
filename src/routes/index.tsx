import { createFileRoute } from "@tanstack/react-router";
import { SovereignCommandCenter } from "@/components/sovereign/SovereignCommandCenter";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Al-Musalli AI-OS — منظومة الإدارة السيادية الفائقة" },
      {
        name: "description",
        content:
          "لوحة القيادة السيادية: المخ والـ 800 أداة، الحميات، المرضى المزمنين، الأمهات، الأطفال، الأطباء، المكملات والأعشاب.",
      },
      { property: "og:title", content: "Al-Musalli AI-OS" },
      { property: "og:description", content: "منظومة الإدارة السيادية الفائقة — 8 غرف تحكم تفاعلية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <SovereignCommandCenter initialTab="brain" />,
});
