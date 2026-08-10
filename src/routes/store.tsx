import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Package, Search, ShoppingCart, Lock, Upload, FileText, CheckCircle,
  MessageSquare, AlertCircle, Phone, ArrowLeft, Loader2, Sparkles, ShoppingBag
} from 'lucide-react';
import { z } from 'zod';
import { listProducts, listCategories } from '@/lib/catalog.functions';
import { scanPrescriptionImage, ScanPrescriptionResponse } from '@/lib/ai/pharmacy-ai';
import type { CatalogProduct } from '@/domain/catalog/schemas';
import { EmptyState, ErrorState, ProductGridSkeleton } from '@/shared/components/StateViews';

const searchSchema = z.object({
  q: z.string().optional(),
  cat: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export const Route = createFileRoute('/store')({
  validateSearch: (raw) => searchSchema.parse(raw),
  head: () => ({
    meta: [
      { title: 'متجر صيدلية المصلي المتكامل — طلبات واتساب الذكية والوصفات' },
      {
        name: 'description',
        content: 'تسوّق أدويتك، ارفع وصفتك الطبية عبر ماسح الذكاء الاصطناعي واطلب مباشرة عبر واتساب صيدلية المصلي.',
      },
    ],
  }),
  component: StorePage,
});

const PAGE_SIZE = 24;

// Official Pharmacy Contact Numbers
const WHATSAPP_PRIMARY = '+967773934270';
const WHATSAPP_SECONDARY = '+967782878280';

function StorePage() {
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? '');
  const [cart, setCart] = useState<Array<{ product: CatalogProduct; quantity: number }>>([]);
  const [scannedResult, setScannedResult] = useState<ScanPrescriptionResponse | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isFetching, isError, refetch, isRefetching } = useQuery({
    queryKey: ['storefront', 'products', search],
    queryFn: () =>
      listProducts({
        data: {
          search: search.q,
          categoryId: search.cat,
          page: search.page,
          pageSize: PAGE_SIZE,
          publicOnly: true,
        },
      }),
    staleTime: 30_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['storefront', 'categories'],
    queryFn: () => listCategories(),
    staleTime: 5 * 60_000,
  });

  const products = data?.items ?? [];
  const total = data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleAddToCart = (product: CatalogProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScannedResult(null);
    try {
      const result = await scanPrescriptionImage(file);
      setScannedResult(result);
    } catch (err) {
      console.error('Error scanning prescription:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const generateWhatsAppMessage = () => {
    let text = `*طلب شراء جديد من متجر صيدلية المصلي*\n\n`;

    if (cart.length > 0) {
      text += `*المنتجات المطلوبة:*\n`;
      cart.forEach((item, index) => {
        const priceText = item.product.sbdma_official_price
          ? `${(item.product.sbdma_official_price * item.quantity).toLocaleString('ar-EG')} ر.ي`
          : 'يحدد لاحقاً';
        text += `${index + 1}. ${item.product.name_ar} (الكمية: ${item.quantity}) - السعر: ${priceText}\n`;
      });
      text += `\n`;
    }

    if (scannedResult && scannedResult.success) {
      text += `*بيانات الوصفة الطبية الممسوحة:*\n`;
      text += `الطبيب: ${scannedResult.doctorName || 'غير محدد'}\n`;
      text += `الأدوية المكتشفة:\n`;
      scannedResult.medicines.forEach((med) => {
        text += `- ${med.name} (${med.dosage || ''}) - الجرعة: ${med.frequency || ''}\n`;
      });
      if (scannedResult.notes) {
        text += `ملاحظات: ${scannedResult.notes}\n`;
      }
    }

    return encodeURIComponent(text);
  };

  const handleWhatsAppCheckout = (number: string) => {
    const message = generateWhatsAppMessage();
    const cleanNumber = number.replace('+', '');
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white" dir="rtl">
      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-xl font-bold tracking-wider text-emerald-400">
                MUSLLY AI OS
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/store" className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm text-emerald-400">
                المتجر الذكي
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-24 sm:px-6 lg:px-8">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/50 to-slate-900 p-8 shadow-2xl">
          <div className="absolute right-0 top-0 -z-10 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"></div>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
                <Sparkles className="h-3 w-3 animate-pulse" /> ذكاء اصطناعي طبي متكامل
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                متجر صيدلية المصلي الرقمي
              </h1>
              <p className="max-w-2xl text-slate-300">
                ارفع وصفتك الطبية المكتوبة بخط اليد ليقوم الذكاء الاصطناعي بقراءتها بدقة وتحويلها لمنتجات سريعة، أو تصفح كتالوج الأدوية والمستلزمات واطلب فوراً عبر واتساب.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                <Upload className="h-5 w-5" /> ارفع وصفتك الطبية
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* AI Scanner Result Overlay / Segment */}
        {isScanning && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-slate-900/50 p-12">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
            <h3 className="text-lg font-semibold">يقوم SUN-GUARDIAN بتحليل الوصفة الطبية بخط اليد...</h3>
            <p className="text-sm text-slate-400">يرجى الانتظار لحين الانتهاء وتحديد الأدوية الطبية المناسبة</p>
          </div>
        )}

        {scannedResult && scannedResult.success && (
          <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/40 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-emerald-400" />
              <h3 className="text-xl font-bold">نتائج المسح الذكي للوصفة الطبية</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm text-slate-400">الطبيب المعالج:</p>
                <p className="font-semibold text-emerald-300">{scannedResult.doctorName}</p>
              </div>
              {scannedResult.notes && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-400">ملاحظات التحليل والتشخيص:</p>
                  <p className="text-sm text-slate-200">{scannedResult.notes}</p>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-4">
              <p className="text-sm font-semibold text-slate-300 mb-3">الأدوية التي تم رصدها بالذكاء الاصطناعي:</p>
              <div className="space-y-2">
                {scannedResult.medicines.map((med, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl bg-slate-950/60 p-4 border border-white/5">
                    <div>
                      <p className="font-bold text-emerald-400">{med.name}</p>
                      <p className="text-xs text-slate-400">الجرعة المحددة: {med.dosage} · التكرار: {med.frequency}</p>
                    </div>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs text-emerald-400">
                      دقة: {Math.round(med.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* E-Commerce Catalog & Checkout */}
        <div className="grid gap-8 lg:grid-cols-4">
          <div className="lg:col-span-3 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-bold">قائمة المنتجات الطبية المتوفرة</h2>
            </div>

            {isError ? (
              <ErrorState
                onRetry={() => void refetch()}
                isRetrying={isRefetching}
                description="تعذّر جلب قائمة المنتجات. تحقّق من الاتصال ثم أعد المحاولة."
              />
            ) : isFetching && products.length === 0 ? (
              <ProductGridSkeleton count={8} />
            ) : products.length === 0 ? (
              <EmptyState
                icon={<Package className="h-8 w-8 text-gray-400" />}
                title="لا توجد نتائج مطابقة"
                description="جرّب البحث عن دواء آخر أو تصفية فئة مختلفة."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((p) => {
                  const price = typeof p.sbdma_official_price === 'number' ? p.sbdma_official_price : null;
                  return (
                    <div key={p.id} className="group flex flex-col rounded-2xl border border-white/10 bg-slate-900/40 p-4 transition hover:border-emerald-500/40 hover:shadow-lg">
                      <div className="mb-3 flex aspect-square items-center justify-center rounded-xl bg-slate-950">
                        <Package className="h-12 w-12 text-slate-700" />
                      </div>
                      <h3 className="line-clamp-2 text-sm font-semibold">{p.name_ar}</h3>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                        {[p.brand, p.strength].filter(Boolean).join(' · ') || '—'}
                      </p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-base font-bold text-emerald-400">
                          {price !== null ? `${price.toLocaleString('ar-EG')} ر.ي` : 'يحدد لاحقاً'}
                        </span>
                        <button
                          onClick={() => handleAddToCart(p)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 transition hover:bg-emerald-400"
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart & WhatsApp Checkout Panel */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-4">
                <ShoppingBag className="h-6 w-6 text-emerald-400" />
                <h3 className="text-lg font-bold">سلة المشتريات والطلب</h3>
              </div>

              {cart.length === 0 && !scannedResult ? (
                <div className="text-center py-8 text-slate-500">
                  السلة فارغة حالياً. أضف أدوية أو ارفع وصفة طبية للبدء.
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <p className="line-clamp-1 font-semibold">{item.product.name_ar}</p>
                        <p className="text-xs text-slate-500">الكمية: {item.quantity}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="text-xs text-rose-400 hover:underline"
                      >
                        حذف
                      </button>
                    </div>
                  ))}

                  <div className="border-t border-white/10 pt-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-300">حدد رقم واتساب صيدلية المصلي لإرسال طلبك:</p>
                    <div className="grid gap-2">
                      <button
                        onClick={() => handleWhatsAppCheckout(WHATSAPP_PRIMARY)}
                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
                      >
                        <MessageSquare className="h-4 w-4" /> واتساب الرئيسي (773934270)
                      </button>
                      <button
                        onClick={() => handleWhatsAppCheckout(WHATSAPP_SECONDARY)}
                        className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 text-sm font-bold text-white transition hover:bg-slate-700 border border-white/10"
                      >
                        <MessageSquare className="h-4 w-4" /> واتساب المساعد (782878280)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Official Support & Contact Contacts */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/30 p-6 space-y-4">
              <h4 className="font-bold text-emerald-400 flex items-center gap-2">
                <Phone className="h-4 w-4" /> قنوات الاتصال والدعم الرسمية
              </h4>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-center justify-between">
                  <span>طلب الأدوية والاستفسارات:</span>
                  <a href={`tel:${WHATSAPP_PRIMARY}`} className="text-emerald-400 font-semibold hover:underline" dir="ltr">
                    +967 773 934 270
                  </a>
                </li>
                <li className="flex items-center justify-between">
                  <span>الدعم الفني وخدمة العملاء:</span>
                  <a href={`tel:${WHATSAPP_SECONDARY}`} className="text-emerald-400 font-semibold hover:underline" dir="ltr">
                    +967 782 878 280
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
