import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Star, Phone, MapPin, Calendar, Stethoscope } from 'lucide-react'
import { supabase } from '@/shared/services/supabase'
import type { Doctor } from '@/types'

export function DoctorsModule() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [specialty, setSpecialty] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDoctors()
  }, [specialty])

  const fetchDoctors = async () => {
    setLoading(true)
    let query = supabase.from('doctors').select('*').eq('is_active', true).eq('is_verified', true)

    if (specialty !== 'all') {
      query = query.eq('specialty', specialty)
    }

    const { data, error } = await query
    if (!error && data) {
      setDoctors(data as Doctor[])
    }
    setLoading(false)
  }

  const specialties = ['all', 'باطنية', 'أطفال', 'جراحة', 'نساء', 'عيون', 'جلدية', 'أسنان', 'قلب', 'أعصاب']

  const filteredDoctors = doctors.filter(d => 
    d.nameAr.includes(searchQuery) || 
    d.specialty.includes(searchQuery) ||
    d.phone.includes(searchQuery)
  )

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث عن طبيب، تخصص، أو رقم..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-right"
            />
          </div>
          <select
            value={specialty}
            onChange={e => setSpecialty(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-right"
          >
            {specialties.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'جميع التخصصات' : s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Stethoscope className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>لا يوجد أطباء مطابقين</p>
          </div>
        ) : (
          filteredDoctors.map((doctor, i) => (
            <motion.div
              key={doctor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel rounded-2xl p-5 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                  {doctor.avatar || '👨‍⚕️'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900">{doctor.nameAr}</h3>
                  <p className="text-sm text-primary font-medium">{doctor.specialty}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3.5 h-3.5 text-gold fill-gold" />
                    <span className="text-sm font-bold">{doctor.rating}</span>
                    <span className="text-xs text-gray-500">({doctor.reviewCount} تقييم)</span>
                  </div>
                </div>
                {doctor.isVerified && (
                  <span className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded-full font-medium">
                    موثق
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{doctor.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{doctor.clinics?.[0]?.address || 'غير متوفر'}</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors">
                  حجز موعد
                </button>
                <button className="px-3 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
