import { motion } from 'framer-motion'
import { Suspense, lazy } from 'react'
import { Link } from '@tanstack/react-router'
import SunCore from '@/shared/components/SunCore'
import PlanetCard from '@/shared/components/PlanetCard'
import { getActivePlanets } from '@/data/planets'
import { Sparkles, ScanLine, Pill, MessageCircle, Box, Search } from 'lucide-react'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import { CosmicSearch } from '@/components/ai/CosmicSearch'
import CategoriesGrid from '@/shared/components/home/CategoriesGrid'
import TestimonialsSection from '@/shared/components/home/TestimonialsSection'
import almoslyLogo from '@/assets/almosly-logo.png.asset.json'


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

      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-gold/30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 4 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-8 py-8">
        {/* Hero — pharmacy identity */}
        <motion.section
          className="relative mb-10 overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-[#D9EEEB] via-white to-[#E8F5F3] px-6 py-10 md:px-12 md:py-14 shadow-sm"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="pointer-events-none absolute -top-16 -left-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />

          <div className="relative grid items-center gap-8 md:grid-cols-[auto_minmax(0,1fr)]">
            <img
              src={almoslyLogo.url}
              alt="صيدلية المصلي — Almosly Pharmacy"
              className="mx-auto h-32 w-32 shrink-0 object-contain md:h-44 md:w-44"
            />
            <div className="text-center md:text-right">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                رعاية دوائية موثوقة · عدن
              </div>
              <h1 className="mt-3 text-3xl font-black leading-tight text-gray-900 md:text-5xl">
                صيدلية <span className="text-primary">المصلي</span>
              </h1>
              <p className="mt-1 text-lg font-semibold tracking-wide text-primary/80">Almosly Pharmacy</p>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-gray-700 md:mx-0 md:text-base">
                صيدلية ذكية تجمع بين خبرة الصيادلة ودقّة الذكاء الصناعي — صرف الوصفات،
                استشارات فورية، وتوصيل الأدوية إلى باب منزلك.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
                <Link
                  to="/shop"
                  search={{ page: 1 }}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition hover:bg-primary/90"
                >
                  تسوّق الأدوية
                </Link>

                <Link
                  to="/ai-chat"
                  className="rounded-xl border border-primary/30 bg-white/70 px-5 py-2.5 text-sm font-semibold text-primary backdrop-blur transition hover:bg-primary/5"
                >
                  استشارة ذكية
                </Link>
                <Link
                  to="/about"
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:text-primary"
                >
                  من نحن ←
                </Link>
              </div>
            </div>
          </div>
        </motion.section>


        {/* Cosmic AI Search — read-only bridge over catalog_products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-10"
        >
          <CosmicSearch />
        </motion.div>



        {/* AI Tools for Customers */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {aiTools.map((tool, i) => (
            <Link
              key={i}
              to={tool.to}
              className="glass-panel rounded-2xl p-4 text-center hover:scale-[1.03] transition-transform cursor-pointer"
            >
              <div className={`w-11 h-11 ${tool.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                <tool.icon className={`w-5 h-5 ${tool.color}`} />
              </div>
              <p className="text-sm font-bold text-gray-900">{tool.label}</p>
              <p className="text-xs text-gray-500 mt-1">{tool.desc}</p>
            </Link>
          ))}
        </motion.div>


        {/* Quick site search → /search */}
        <motion.form
          action="/search"
          method="get"
          className="mb-6 flex items-center gap-2 rounded-2xl border border-primary/15 bg-white/80 p-2 shadow-sm backdrop-blur"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
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
        </motion.form>

        {/* Categories */}
        <CategoriesGrid />




        {/* 3D Solar System */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-4">
            <Box className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-gray-900">النظام الكوني ثلاثي الأبعاد</h2>
          </div>
          <Suspense fallback={<LoadingSpinner text="جاري تحميل النظام الكوني..." />}>
            <SolarSystem3D />
          </Suspense>
        </motion.div>

        {/* Planets Grid */}
        <div>
          <motion.div 
            className="flex items-center gap-3 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="w-1 h-8 bg-gradient-to-b from-primary to-gold rounded-full" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">النظام الكوني</h2>
              <p className="text-sm text-gray-500">{planets.length} كوكب وظيفي يدور حول الشمس</p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {planets.map((planet, index) => (
              <PlanetCard key={planet.id} planet={planet} index={index} />
            ))}
          </div>
        </div>

        {/* Customer testimonials */}
        <TestimonialsSection />


        {/* Footer */}
        <motion.div 
          className="mt-12 text-center pb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <p className="text-sm text-gray-400">
            MUSLLY AI OS v1.0 | صيدلية المصلي — عدن | جميع الحقوق محفوظة © 2026
          </p>
        </motion.div>
      </div>
    </div>
  )
}
