// Unified admin hub — links to every /admin-* page in one categorized dashboard.
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3, Bot, Boxes, Calendar, ClipboardList, Cog, Database, FileText,
  Gift, Heart, Image as ImageIcon, LayoutDashboard, LineChart, Mail, Megaphone,
  MessageSquare, Package, Percent, ShieldCheck, ShoppingCart, Sparkles, Stethoscope,
  Store, Truck, Users, Wand2, Workflow, AlertTriangle, Activity, Archive, Tag,
  Network, FlaskConical, Send, RotateCw,
} from "lucide-react";
import { AdminGate } from "@/components/admin/AdminGate";
import { RefreshAdminSession } from "@/components/admin/RefreshAdminSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/admin-hub")({
  component: () => (
    <AdminGate>
      <AdminHub />
    </AdminGate>
  ),
});

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; desc?: string };
type Section = { title: string; emoji: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: "نظرة عامة",
    emoji: "📊",
    items: [
      { to: "/_authenticated/admin-dashboard", label: "لوحة التحكم التنفيذية", icon: LayoutDashboard, desc: "KPIs والإيرادات" },
      { to: "/admin-command", label: "مركز القيادة", icon: ShieldCheck },
      { to: "/admin-ai-executive-dashboard", label: "لوحة AI التنفيذية", icon: LineChart },
      { to: "/admin-ai-executive", label: "تقارير المدير", icon: BarChart3 },
      { to: "/_authenticated/admin-sales-reports", label: "تقارير المبيعات", icon: BarChart3 },
    ],
  },
  {
    title: "المخزون والمنتجات",
    emoji: "📦",
    items: [
      { to: "/admin-products", label: "المنتجات", icon: Package },
      { to: "/admin-inventory", label: "المخزون", icon: Boxes },
      { to: "/_authenticated/admin-upload-inventory", label: "رفع المخزون", icon: Archive },
      { to: "/admin-inventory-duplicates", label: "تكرارات المخزون", icon: ClipboardList },
      { to: "/admin-inventory-reservations", label: "حجوزات المخزون", icon: ClipboardList },
      { to: "/_authenticated/admin-inventory-sync-logs", label: "سجلات مزامنة المخزون", icon: Activity },
      { to: "/admin-stock-audit", label: "تدقيق المخزون", icon: ClipboardList },
      { to: "/admin-transfers", label: "تحويلات المخزون", icon: Truck },
      { to: "/admin-branches", label: "الفروع", icon: Store },
      { to: "/admin-bundles", label: "الباقات", icon: Gift },
      { to: "/admin-classifications", label: "تصنيفات المنتجات", icon: Tag },
      { to: "/admin-product-gallery", label: "معرض الصور", icon: ImageIcon },
    ],
  },
  {
    title: "الذكاء الاصطناعي والوكلاء",
    emoji: "🤖",
    items: [
      { to: "/admin-agents", label: "الوكلاء", icon: Bot },
      { to: "/admin-agent-insights", label: "رؤى الوكلاء", icon: Sparkles },
      { to: "/admin-ai-orchestrator", label: "منسق AI", icon: Workflow },
      { to: "/admin-ai-approvals", label: "موافقات AI", icon: ShieldCheck },
      { to: "/admin-ai-catalog", label: "كتالوج AI", icon: Package },
      { to: "/admin-ai-inventory", label: "AI المخزون", icon: Boxes },
      { to: "/admin-ai-procurement", label: "AI المشتريات", icon: ShoppingCart },
      { to: "/admin-ai-sales-cx", label: "AI المبيعات والعملاء", icon: Heart },
      { to: "/admin-ai-marketing", label: "AI التسويق", icon: Megaphone },
      { to: "/admin-ai-loyalty", label: "AI الولاء", icon: Sparkles },
      { to: "/admin-ai-chronic-refill", label: "AI الأدوية المزمنة", icon: Stethoscope },
      { to: "/admin-ai-whatsapp", label: "AI واتساب", icon: MessageSquare },
      { to: "/admin-ai-excel-import", label: "استيراد Excel بـAI", icon: FileText },
      { to: "/admin-ai-extractions", label: "استخراجات AI", icon: Wand2 },
      { to: "/admin-ai-extraction-failures", label: "فشل استخراجات AI", icon: AlertTriangle },
      { to: "/admin-pharmacy-recommendations", label: "توصيات الصيدلية", icon: Stethoscope },
    ],
  },
  {
    title: "الوصفات الطبية",
    emoji: "💊",
    items: [
      { to: "/admin-rx-review", label: "مراجعة الوصفات", icon: Stethoscope },
      { to: "/admin-rx-check", label: "فحص الوصفات", icon: Stethoscope },
      { to: "/admin-rx-extraction-edit", label: "تعديل الاستخراج", icon: FileText },
    ],
  },
  {
    title: "التسويق والولاء",
    emoji: "📣",
    items: [
      { to: "/admin-marketing", label: "التسويق", icon: Megaphone },
      { to: "/_authenticated/admin-marketing-campaigns", label: "حملات التسويق", icon: Send },
      { to: "/admin-campaigns", label: "الحملات", icon: Send },
      { to: "/admin-banners", label: "البانرات", icon: ImageIcon },
      { to: "/admin-offers", label: "العروض", icon: Percent },
      { to: "/admin-discounts", label: "الخصومات", icon: Percent },
      { to: "/admin-social-posts", label: "منشورات السوشيال", icon: Send },
      { to: "/admin-loyalty-dashboard", label: "لوحة الولاء", icon: Gift },
    ],
  },
  {
    title: "العمليات والتواصل",
    emoji: "💬",
    items: [
      { to: "/admin-whatsapp-conversations", label: "محادثات واتساب", icon: MessageSquare },
      { to: "/admin-whatsapp-delivery", label: "تسليم واتساب", icon: Send },
      { to: "/admin-automation-hub", label: "أتمتة العمليات", icon: Workflow },
      { to: "/admin-workforce", label: "الموظفون", icon: Users },
    ],
  },
  {
    title: "النظام والصحة",
    emoji: "🛡️",
    items: [
      { to: "/_authenticated/admin-health", label: "صحة النظام", icon: Activity },
      { to: "/admin-diagnostics", label: "التشخيصات", icon: FlaskConical },
      { to: "/admin-logs", label: "السجلات", icon: FileText },
      { to: "/admin-event-bus", label: "Event Bus", icon: Network },
      { to: "/admin-cron-jobs", label: "مهام Cron", icon: Calendar },
      { to: "/admin-cron-health", label: "صحة Cron", icon: Activity },
      { to: "/admin-trigger-failures", label: "فشل المحفزات", icon: AlertTriangle },
      { to: "/admin-hmac-preflight", label: "فحص HMAC", icon: ShieldCheck },
      { to: "/admin-backups", label: "النسخ الاحتياطية", icon: Database },
      { to: "/admin-settings", label: "الإعدادات", icon: Cog },
    ],
  },
];

function AdminHub() {
  return (
    <div className="min-h-screen bg-muted/30 p-6" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">🚀 مركز الأدمن الموحد</h1>
            <p className="text-muted-foreground mt-1">
              جميع أدوات الإدارة في مكان واحد
            </p>
          </div>
          <div className="flex gap-2">
            <RefreshAdminSession />
            <Link
              to="/admin-command"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <ShieldCheck className="h-4 w-4" />
              مركز القيادة
            </Link>
          </div>
        </header>

        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-lg">
                <span className="ml-2">{section.emoji}</span>
                {section.title}
                <span className="text-muted-foreground text-sm font-normal mr-2">
                  ({section.items.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to as never}
                      className="group flex items-start gap-3 rounded-lg border bg-card p-3 transition hover:border-primary hover:shadow-md"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{item.label}</div>
                        {item.desc && (
                          <div className="text-xs text-muted-foreground truncate">{item.desc}</div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        <footer className="text-center text-xs text-muted-foreground py-4 flex items-center justify-center gap-2">
          <RotateCw className="h-3 w-3" />
          إذا منحت صلاحيات جديدة، اضغط «تحديث صلاحيات الأدمن» أعلاه لتفعيلها فوراً.
        </footer>
      </div>
    </div>
  );
}
