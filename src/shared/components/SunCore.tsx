import { motion } from 'framer-motion'
import { useNavigate } from '@tanstack/react-router'
import { Cpu, Zap, Brain, Activity } from 'lucide-react'

export default function SunCore() {
  const navigate = useNavigate()

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center cursor-pointer group"
      onClick={() => navigate({ to: '/mission-control' })}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Outer glow rings */}
      <div className="absolute w-64 h-64 rounded-full border border-gold/10 animate-pulse-slow" />
      <div className="absolute w-56 h-56 rounded-full border border-gold/20 animate-pulse-slow animate-delay-500" />
      <div className="absolute w-48 h-48 rounded-full border border-gold/30 animate-pulse-slow animate-delay-1000" />

      {/* Main sun */}
      <motion.div
        className="relative w-36 h-36 md:w-44 md:h-44 rounded-full sun-glow flex items-center justify-center"
        style={{
          background: 'radial-gradient(circle at 30% 30%, #FFD700, #C9A227, #B8860B)',
        }}
        animate={{
          boxShadow: [
            '0 0 60px rgba(201, 162, 39, 0.3), 0 0 120px rgba(201, 162, 39, 0.2)',
            '0 0 80px rgba(201, 162, 39, 0.5), 0 0 160px rgba(201, 162, 39, 0.3)',
            '0 0 60px rgba(201, 162, 39, 0.3), 0 0 120px rgba(201, 162, 39, 0.2)',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Inner core */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-yellow-300 via-gold to-yellow-600 opacity-90" />

        {/* AI Brain icon */}
        <div className="relative z-10 flex flex-col items-center">
          <Brain className="w-12 h-12 md:w-16 md:h-16 text-white drop-shadow-lg" />
          <span className="text-white text-xs md:text-sm font-bold mt-1 drop-shadow-md">AI SUN</span>
        </div>

        {/* Rotating particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-white/60"
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{
              transformOrigin: 'center',
              top: '50%',
              left: '50%',
              marginTop: -4,
              marginLeft: -4,
            }}
          >
            <div 
              className="w-2 h-2 rounded-full bg-white/80"
              style={{ transform: `translateX(${70 + i * 5}px)` }}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Status indicators */}
      <div className="mt-6 flex items-center gap-4">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-green-700">ONLINE</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 rounded-full">
          <Cpu className="w-3 h-3 text-primary" />
          <span className="text-xs font-medium text-primary">99.9%</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 rounded-full">
          <Zap className="w-3 h-3 text-gold" />
          <span className="text-xs font-medium text-gold">800 Tools</span>
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-500 text-center max-w-xs">
        اضغط على الشمس للدخول إلى مركز القيادة
      </p>
    </motion.div>
  )
}
