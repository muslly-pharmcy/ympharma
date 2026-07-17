import { createFileRoute, ErrorComponent, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SovereignEngineDashboard } from "@/modules/ai-brain/components/SovereignEngineDashboard";

export const Route = createFileRoute("/_authenticated/admin-ai-brain")({
  head: () => ({
    meta: [
      { title: "المخ السيادي — لوحة التحكم" },
      { name: "description", content: "لوحة تشغيل نواة القرارات الإدراكية: سلامة دوائية، توجيه جغرافي، واقتراح حملات." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminAiBrainPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-6 space-y-3">
        <ErrorComponent error={error} />
        <Button onClick={() => { router.invalidate(); reset(); }}>إعادة المحاولة</Button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-6">الصفحة غير موجودة</div>,
});

function AdminAiBrainPage() {
  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4">
      <SovereignEngineDashboard />
    </div>
  );
}
