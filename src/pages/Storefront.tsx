import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { motion } from 'framer-motion'
import {
  Search,
  Package,
  ShieldCheck,
  Truck,
  Stethoscope,
  Sparkles,
  MessageCircle,
  Pill,
} from 'lucide-react'
import { listProducts, listCategories } from '@/lib/catalog.functions'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { OnboardingDocModal } from '@/components/store/OnboardingDocModal'
import { HealthBundles } from '@/components/store/HealthBundles'
import { PrescriptionUploadModal } from '@/components/store/PrescriptionUploadModal'
import { Skeleton } from '@/components/skeletons/Skeleton'


const TRUST = [
  { icon: ShieldCheck, title: 'أدوية أصلية', body: 'مصادر معتمدة وتخزين وفق المعايير الدوائية.' },
  { icon: Truck, title: 'توصيل سريع', body: 'خدمة توصيل موثوقة داخل عدن والمحافظات.' },
  { icon: Stethoscope, title: 'استشارة صيدلي', body: 'إرشاد دوائي مجاني قبل وبعد الشراء.' },
] as const

export default function Storefront() {
  const [rawSearch, setRawSearch] = useState('')
  const [rxOpen, setRxOpen] = useState(false)
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)

  const search = useDebounce(rawSearch, 300)

  const productsFn = useServerFn(listProducts)
  const categoriesFn = useServerFn(listCategories)

  const { data: categories = [] } = useQuery({
    queryKey: ['storefront', 'categories'],
    queryFn: () => categoriesFn(),
    staleTime: 10 * 60_000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['storefront', 'home-products', search, categoryId],
    queryFn: () =>
      productsFn({
        data: { search: search || undefined, categoryId, page: 1, pageSize: 24 },
      }),
    staleTime: 60_000,
  })

  const products = useMemo(
    () =>
      (data?.items ?? []) as unknown as Array<{
        id: string
        name_ar?: string | null
        name_en?: string | null
        brand?: string | null
        dosage_form?: string | null
        sbdma_official_price?: number | null
        image_url?: string | null
        primary_image_url?: string | null
      }>,
    [data],
  )

  return (
    <div dir="rtl" className="min-h-screen">
      <OnboardingDocModal />
      <PrescriptionUploadModal open={rxOpen} onClose={() => setRxOpen(false)} />


      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-10 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass-card rounded-3xl p-6 sm:p-10"
          >
            <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> صيدلية إلكترونية موثوقة
            </p>
            <h1 className="mt-4 text-3xl font-black leading-tight text-foreground sm:text-5xl">
              صيدلية المصلي — دواؤك يصلك بثقة
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              تصفّح آلاف الأدوية ومستحضرات العناية بأسعار معتمدة، مع إرشاد دوائي دقيق
              وتوصيل سريع — بدون الحاجة لإنشاء حساب.
            </p>

            <div className="relative mt-6 max-w-2xl">
              <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={rawSearch}
                onChange={(e) => setRawSearch(e.target.value)}
                placeholder="ابحث عن دواء، مادة فعالة، أو علامة تجارية…"
                aria-label="بحث عن منتج"
                className="w-full rounded-2xl border border-border bg-background/80 py-3.5 pr-12 pl-4 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/shop"
                search={{ page: 1 }}
                className="press-scale rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20"
              >
                تسوّق الآن
              </Link>
              <Link
                to="/request"
                className="press-scale rounded-2xl border border-border bg-background/70 px-5 py-2.5 text-sm font-bold text-foreground"
              >
                اطلب دواء أو استشارة
              </Link>
              <Link
                to="/tools"
                className="press-scale rounded-2xl border border-border bg-background/70 px-5 py-2.5 text-sm font-bold text-foreground"
              >
                الأدوات الصحية
              </Link>
              <button
                onClick={() => setRxOpen(true)}
                className="press-scale rounded-2xl border border-primary/30 bg-primary/5 px-5 py-2.5 text-sm font-bold text-primary"
              >
                رفع الوصفة الطبية
              </button>
            </div>

          </motion.div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {TRUST.map((t, i) => (
              <motion.div
                key={t.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i }}
                className="glass-panel flex items-start gap-3 rounded-2xl p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <t.icon className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-3 text-lg font-bold text-foreground">تصفّح الأقسام</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategoryId(undefined)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  !categoryId
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-background/70 text-foreground hover:border-primary/40'
                }`}
              >
                الكل
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    categoryId === c.id
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-background/70 text-foreground hover:border-primary/40'
                  }`}
                >
                  {c.name_ar ?? c.name_en}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Products */}
      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-lg font-bold text-foreground">منتجات مختارة</h2>
            <Link to="/shop" search={{ page: 1 }} className="text-sm font-semibold text-primary hover:underline">
              عرض كل المنتجات ←
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="glass-panel rounded-2xl py-16 text-center text-muted-foreground">
              <Package className="mx-auto mb-3 h-10 w-10 opacity-50" />
              لا توجد نتائج مطابقة.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.04 }}
                >
                  <Link
                    to="/product/$productId"
                    params={{ productId: p.id }}
                    className="group block overflow-hidden rounded-2xl border border-border bg-background/70 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="flex aspect-square items-center justify-center overflow-hidden bg-muted/50">
                      {p.primary_image_url || p.image_url ? (
                        <img
                          src={p.primary_image_url ?? p.image_url ?? ''}
                          alt={p.name_ar ?? p.name_en ?? 'منتج'}
                          loading="lazy"
                          className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <Pill className="h-10 w-10 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="space-y-1 p-3">
                      <p className="line-clamp-2 text-sm font-semibold text-foreground">
                        {p.name_ar ?? p.name_en}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {p.brand ?? p.dosage_form ?? '—'}
                      </p>
                      <p className="pt-1 text-sm font-bold text-primary">
                        {typeof p.sbdma_official_price === 'number'
                          ? `${p.sbdma_official_price.toLocaleString('ar-EG')} ر.ي`
                          : 'اسأل عن السعر'}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Consultation CTA */}
      <section className="px-4 pb-14 sm:px-6 lg:px-8">
        <div className="glass-card mx-auto flex max-w-6xl flex-col items-center gap-4 rounded-3xl p-8 text-center">
          <MessageCircle className="h-8 w-8 text-primary" />
          <h2 className="text-xl font-bold text-foreground">تحتاج مساعدة في اختيار الدواء؟</h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            فريق الصيادلة جاهز للرد على استفساراتك حول الجرعات والتداخلات الدوائية.
          </p>
          <Link
            to="/contact"
            className="press-scale rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20"
          >
            تواصل معنا
          </Link>
        </div>
      </section>
    </div>
  )
}
