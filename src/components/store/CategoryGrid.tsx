import { motion } from 'framer-motion'
import {
  Layers,
  Stethoscope,
  Pill,
  Droplets,
  Baby,
  Leaf,
  FlaskConical,
  HeartPulse,
  Smile,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

export interface StoreCategory {
  id: string
  label: string
}

interface CategoryGridProps {
  categories: StoreCategory[]
  activeCategoryId?: string | undefined
  onSelect: (id: string | undefined) => void
}

const THEMES: Array<{ Icon: LucideIcon; glow: string; tint: string }> = [
  { Icon: Stethoscope, glow: 'from-sky-400/40 via-cyan-400/25 to-teal-400/30', tint: 'text-sky-600' },
  { Icon: Pill, glow: 'from-emerald-400/40 via-teal-400/25 to-lime-400/30', tint: 'text-emerald-600' },
  { Icon: Droplets, glow: 'from-fuchsia-400/35 via-pink-400/25 to-rose-400/30', tint: 'text-fuchsia-600' },
  { Icon: Baby, glow: 'from-indigo-400/35 via-sky-400/25 to-violet-400/30', tint: 'text-indigo-600' },
  { Icon: Leaf, glow: 'from-lime-400/35 via-emerald-400/25 to-green-400/30', tint: 'text-lime-600' },
  { Icon: FlaskConical, glow: 'from-amber-400/35 via-orange-400/25 to-yellow-400/30', tint: 'text-amber-600' },
  { Icon: HeartPulse, glow: 'from-rose-400/35 via-red-400/25 to-orange-400/30', tint: 'text-rose-600' },
  { Icon: Smile, glow: 'from-cyan-400/35 via-blue-400/25 to-indigo-400/30', tint: 'text-cyan-600' },
]

const KEYWORD_ICON: Array<[string[], LucideIcon]> = [
  [['برد', 'سعال', 'انفلونزا', 'تنفس', 'cold', 'respir'], Stethoscope],
  [['مسكن', 'ألم', 'الم', 'حرارة', 'pain', 'analg'], Pill],
  [['بشرة', 'جلد', 'عناية', 'تجميل', 'skin', 'derma', 'cosmet'], Droplets],
  [['طفل', 'أطفال', 'الأم', 'رضع', 'baby', 'child', 'mother'], Baby],
  [['فيتامين', 'مكمل', 'vitamin', 'supplement'], Leaf],
  [['مضاد', 'حيوي', 'antibio', 'إسعاف', 'اسعاف'], FlaskConical],
  [['قلب', 'ضغط', 'سكر', 'هضمي', 'heart', 'diabet', 'cardio'], HeartPulse],
  [['أسنان', 'فم', 'dental', 'oral'], Smile],
]

function themeFor(label: string, index: number) {
  const lower = label.toLowerCase()
  const hit = KEYWORD_ICON.find(([words]) => words.some((w) => lower.includes(w.toLowerCase())))
  const base = THEMES[index % THEMES.length]!
  return { Icon: hit ? hit[1] : base.Icon, glow: base.glow, tint: base.tint }
}

export function CategoryGrid({ categories, activeCategoryId, onSelect }: CategoryGridProps) {
  if (categories.length === 0) return null

  return (
    <section dir="rtl" className="px-4 pb-2 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-black text-foreground">تصفّح الأقسام</h2>
        </div>

        <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CategoryCard
            Icon={Sparkles}
            glow="from-teal-400/40 via-emerald-400/25 to-cyan-400/30"
            tint="text-teal-600"
            label="كل الأقسام"
            active={!activeCategoryId}
            onClick={() => onSelect(undefined)}
          />
          {categories.map((c, i) => {
            const t = themeFor(c.label, i)
            return (
              <CategoryCard
                key={c.id}
                Icon={t.Icon}
                glow={t.glow}
                tint={t.tint}
                label={c.label}
                active={activeCategoryId === c.id}
                onClick={() => onSelect(activeCategoryId === c.id ? undefined : c.id)}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}

function CategoryCard({
  Icon,
  glow,
  tint,
  label,
  active,
  onClick,
}: {
  Icon: LucideIcon
  glow: string
  tint: string
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      aria-pressed={active}
      className={`relative isolate flex w-32 shrink-0 snap-start flex-col items-center gap-2 overflow-hidden rounded-3xl border p-4 shadow-2xl backdrop-blur-xl transition sm:w-36 ${
        active
          ? 'border-primary/50 bg-white/90 dark:bg-slate-900/90'
          : 'border-white/30 bg-white/80 dark:bg-slate-900/80'
      }`}
    >
      <span
        className={`pointer-events-none absolute -top-8 left-1/2 -z-10 h-24 w-24 -translate-x-1/2 rounded-full bg-gradient-to-br ${glow} blur-2xl`}
      />
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/50 bg-white/70 shadow-[0_12px_24px_-12px_rgba(15,60,55,0.6)] backdrop-blur-md dark:border-white/10 dark:bg-slate-800/70">
        <Icon className={`h-6 w-6 ${tint}`} strokeWidth={1.8} />
      </span>
      <span className="line-clamp-2 text-center text-xs font-bold text-foreground">{label}</span>
      {active && <span className="h-1 w-8 rounded-full bg-primary" />}
    </motion.button>
  )
}

export default CategoryGrid
