import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Lock, Eye, EyeOff, Key, UserCheck, AlertTriangle, CheckCircle } from 'lucide-react'

export function SecurityModule() {
  const [showSecrets, setShowSecrets] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'rbac' | 'audit' | 'rls'>('overview')

  const securityStatus = [
    { label: 'RLS', status: 'مفعل', ok: true, icon: Shield },
    { label: 'RBAC', status: 'مفعل', ok: true, icon: UserCheck },
    { label: 'Encryption', status: 'AES-256', ok: true, icon: Lock },
    { label: 'Audit Log', status: 'يسجل', ok: true, icon: Eye },
    { label: 'Rate Limit', status: 'مفعل', ok: true, icon: Key },
    { label: '2FA', status: 'مفعل للأدمن', ok: true, icon: CheckCircle },
  ]

  const auditLogs = [
    { action: 'تسجيل دخول', user: 'admin@mussly.ai', time: 'منذ 5 دقائق', type: 'info' },
    { action: 'تعديل منتج', user: 'pharmacist@branch1.ye', time: 'منذ 15 دقيقة', type: 'warning' },
    { action: 'طلب جديد', user: 'customer@email.com', time: 'منذ 30 دقيقة', type: 'info' },
    { action: 'محاولة دخول فاشلة', user: 'unknown', time: 'منذ ساعة', type: 'error' },
    { action: 'تصدير تقرير', user: 'admin@mussly.ai', time: 'منذ ساعتين', type: 'info' },
  ]

  const roles = [
    { name: 'Super Admin', permissions: ['الكل'], users: 1 },
    { name: 'Admin', permissions: ['قراءة', 'كتابة', 'حذف'], users: 3 },
    { name: 'Pharmacist', permissions: ['المنتجات', 'الطلبات', 'الوصفات'], users: 8 },
    { name: 'Doctor', permissions: ['المرضى', 'الوصفات', 'المواعيد'], users: 12 },
    { name: 'Customer', permissions: ['الطلبات', 'الملف الشخصي'], users: 2847 },
  ]

  return (
    <div className="space-y-6">
      {/* Security Status */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {securityStatus.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-panel rounded-2xl p-5"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                item.ok ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <item.icon className={`w-5 h-5 ${item.ok ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div>
                <p className="font-bold text-gray-900">{item.label}</p>
                <p className={`text-sm ${item.ok ? 'text-green-600' : 'text-red-600'}`}>{item.status}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex gap-2">
          {[
            { id: 'overview', label: 'نظرة عامة' },
            { id: 'rbac', label: 'الأدوار' },
            { id: 'audit', label: 'السجل' },
            { id: 'rls', label: 'RLS' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="glass-panel rounded-2xl p-6">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 mb-4">حالة الأمن العامة</h3>
            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-700">النظام آمن — لا يوجد تهديدات نشطة</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-xs text-gray-500">تهديدات</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-2xl font-bold text-gray-900">2,847</p>
                <p className="text-xs text-gray-500">مستخدمين</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-2xl font-bold text-gray-900">5</p>
                <p className="text-xs text-gray-500">أدوار</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rbac' && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 mb-4">إدارة الأدوار والصلاحيات</h3>
            <div className="space-y-3">
              {roles.map((role, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-bold text-gray-900">{role.name}</p>
                    <p className="text-sm text-gray-500">{role.permissions.join(' • ')}</p>
                  </div>
                  <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                    {role.users} مستخدم
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 mb-4">سجل التدقيق</h3>
            <div className="space-y-3">
              {auditLogs.map((log, i) => (
                <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${
                  log.type === 'error' ? 'bg-red-50' : log.type === 'warning' ? 'bg-amber-50' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center gap-3">
                    {log.type === 'error' ? (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    ) : log.type === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm text-gray-900">{log.action}</p>
                      <p className="text-xs text-gray-500">{log.user}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rls' && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 mb-4">Row Level Security</h3>
            <div className="space-y-3">
              {[
                { table: 'products', policy: 'الكل يقرأ، الأدمن يدير', status: 'مفعل' },
                { table: 'orders', policy: 'المستخدم يقرأ طلباته، الأدمن يقرأ الكل', status: 'مفعل' },
                { table: 'patients', policy: 'المستخدم يقرأ سجله فقط', status: 'مفعل' },
                { table: 'doctors', policy: 'الكل يقرأ المُوثقين', status: 'مفعل' },
                { table: 'financial_transactions', policy: 'الأدمن والمالية فقط', status: 'مفعل' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900">{item.table}</p>
                    <p className="text-sm text-gray-500">{item.policy}</p>
                  </div>
                  <span className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded-full font-medium">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
