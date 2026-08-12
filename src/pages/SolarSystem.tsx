import { Suspense, lazy } from 'react'
import { Link } from '@tanstack/react-router'
import PlanetCard from '@/shared/components/PlanetCard'
import { getActivePlanets } from '@/data/planets'
import { Sparkles, ScanLine, Pill, MessageCircle, Box, Search } from 'lucide-react'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import { LazyInView } from '@/shared/components/LazyInView'
import { CosmicSearch } from '@/components/ai/CosmicSearch'
import CategoriesGrid from '@/shared/components/home/CategoriesGrid'
import TestimonialsSection from '@/shared/components/home/TestimonialsSection'
import { ToolsIntroSection } from '@/shared/components/home/ToolsIntroSection'
import { GlassHero } from '@/shared/components/home/GlassHero'
import { Reveal, Stagger, RevealItem } from '@/shared/components/motion/Reveal'


const SolarSystem3D = lazy(() => import('@/shared/3d/SolarSystem3D'))

export default function SolarSystem() {
  const planets = getActivePlanets()

  const aiTools = [
    { label: 'مسح الوصفة', desc: 'صوّر وصفتك', icon: ScanLine, color: 'text-blue-600', bg: 'bg-blue-50', to: '/vision-lab' },
    { label: 'استشارة ذكية', desc: 'اسأل الصيدلي AI', icon: MessageCircle, color: 'text-green-600', bg: 'bg-green-50', to: '/ai-chat' },
    { label: 'ابحث عن دواء', desc: 'كتالوج المنتجات', icon: Pill, color: 'text-purple-600', bg: 'bg-purple-50', to: '/shop' },
    { label: 'تحليل ذكي', desc: 'وصفتك بلمسة', icon: Sparkles, color: 'text-gold', bg: 'bg-gold/10', to: '/ai-chat' },
  ]


  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 gradient-glow pointer-events-none" />

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-8 py-8">
        {/* Hero — glassmorphic identity panel with ambient WebGL backdrop */}
        <GlassHero />

        {/* Cosmic AI Search — read-only bridge over catalog_products */}
        <Reveal className="mb-10">
          <CosmicSearch />
        </Reveal>



        {/* AI Tools for Customers — Bento grid */}
        <Stagger className="bento-grid mb-10">
          {aiTools.map((tool, i) => (
            <RevealItem key={i} className="col-span-1">
              <Link
                to={tool.to}
                className="glass-card press-scale flex h-full flex-col items-center justify-center gap-2 p-5 text-center"
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tool.bg}`}>
                  <tool.icon className={`h-5 w-5 ${tool.color}`} />
                </span>
                <p className="text-sm font-bold text-gray-900">{tool.label}</p>
                <p className="text-xs text-gray-500">{tool.desc}</p>
              </Link>
            </RevealItem>
          ))}
        </Stagger>

        {/* Quick site search → /search */}
        <Reveal className="mb-6">
        <form
          action="/search"
          method="get"
          className="glass-card flex items-center gap-2 p-2"
        >
          <Search className="mx-2 h-5 w-5 text-primary" />
          <input
            type="text"
            name="q"
            placeholder="ابحث عن دواء، منتج، أو خدمة..."
            className="flex-1 bg-transparent px-2 py-2 text-sm outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            بحث
          </button>
        </form>
        </Reveal>

        {/* Categories */}
        <CategoriesGrid />




        {/* 3D Solar System */}
        <Reveal className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Box className="w-5 h-5 text-primary" />
            <h2 className="text-fluid-title font-bold text-gray-900">النظام الكوني ثلاثي الأبعاد</h2>
          </div>
          <LazyInView fallback={<LoadingSpinner text="جاري تحميل النظام الكوني..." />} minHeight={500}>
            <Suspense fallback={<LoadingSpinner text="جاري تحميل النظام الكوني..." />}>
              <SolarSystem3D />
            </Suspense>
          </LazyInView>
        </Reveal>

        {/* Planets Grid */}
        <div>
          <Reveal className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-primary to-gold rounded-full" />
            <div>
              <h2 className="text-fluid-title font-bold text-gray-900">النظام الكوني</h2>
              <p className="text-sm text-gray-500">{planets.length} كوكب وظيفي يدور حول الشمس</p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {planets.map((planet, index) => (
              <PlanetCard key={planet.id} planet={planet} index={index} />
            ))}
          </div>
        </div>

        {/* Site tools intro */}
        <ToolsIntroSection />

        {/* Customer testimonials */}
        <TestimonialsSection />


        {/* Footer */}
        <Reveal className="mt-12 text-center pb-8">
          <p className="text-sm text-gray-400">
            MUSLLY AI OS v1.0 | صيدلية المصلي — عدن | جميع الحقوق محفوظة © 2026
          </p>
        </Reveal>
      </div>
    </div>
  )
}
