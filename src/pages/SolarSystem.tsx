import { motion } from 'framer-motion'
import { Suspense, lazy } from 'react'
import { Link } from '@tanstack/react-router'
import SunCore from '@/shared/components/SunCore'
import PlanetCard from '@/shared/components/PlanetCard'
import { getActivePlanets } from '@/data/planets'
import { Sparkles, ScanLine, Pill, MessageCircle, Box } from 'lucide-react'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import { CosmicSearch } from '@/components/ai/CosmicSearch'

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
        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            <span className="text-gradient">MUSLLY AI OS</span>
          </h1>
          <p className="text-gray-500 text-lg">منصة التشغيل الصحية الوطنية — صيدلية المصلي</p>
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-primary/5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-primary font-medium">النظام يعمل بكامل طاقته</span>
          </div>
        </motion.div>

        {/* Cosmic AI Search — read-only bridge over catalog_products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-10"
        >
          <CosmicSearch />
        </motion.div>



        {/* Quick Stats */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {stats.map((stat, i) => (
            <div key={i} className="glass-panel rounded-2xl p-4 text-center">
              <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
              <span className={`text-xs font-medium ${stat.color}`}>{stat.change}</span>
            </div>
          ))}
        </motion.div>

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
