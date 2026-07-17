import { createFileRoute, ErrorComponent, useRouter, useSearch } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { AdminGate } from "@/components/admin/AdminGate";
import {
  SovereignCommandCenter,
  SOVEREIGN_TABS,
  type SovereignTab,
} from "@/components/sovereign/SovereignCommandCenter";

export const Route = createFileRoute("/_authenticated/admin-sovereign")({
  validateSearch: (s: Record<string, unknown>): { tab?: SovereignTab } => {
    const t = typeof s.tab === "string" && (SOVEREIGN_TABS as string[]).includes(s.tab)
      ? (s.tab as SovereignTab)
      : undefined;
    return t ? { tab: t } : {};
  },
  head: () => ({
    meta: [
      { title: "مركز القيادة السيادي — Al-Musalli AI-OS" },
      { name: "description", content: "غرف تحكم موحّدة: المخ السيادي، الحميات، الأمومة، الأطفال، الأطباء، المكملات والأعشاب." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminGate>
      <AdminSovereign />
    </AdminGate>
  ),
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

function AdminSovereign() {
  const search = useSearch({ from: "/_authenticated/admin-sovereign" });
  return <SovereignCommandCenter initialTab={search.tab ?? "brain"} />;
}

