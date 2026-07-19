import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, AlertCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-24 h-24 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-12 h-12 text-gray-400" />
        </div>
        <h1 className="text-6xl font-bold text-gray-200 mb-2">404</h1>
        <h2 className="text-xl font-bold text-gray-900 mb-2">الصفحة غير موجودة</h2>
        <p className="text-gray-500 mb-6">الصفحة التي تبحث عنها غير موجودة في هذا الكون</p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2">
          <Home className="w-4 h-4" />
          العودة للرئيسية
        </Link>
      </motion.div>
    </div>
  )
}
