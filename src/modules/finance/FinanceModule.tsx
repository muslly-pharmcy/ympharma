import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, DollarSign, PieChart, Calendar } from 'lucide-react'
import { supabase } from '@/shared/services/supabase'
import type { FinancialTransaction } from '@/types'

export function FinanceModule() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTransactions()
  }, [period])

  const fetchTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) {
      setTransactions(data as FinancialTransaction[])
    }
    setLoading(false)
  }

  const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0)
  const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0)
  const profit = income - expense

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs text-green-600 font-medium">+12%</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{income.toLocaleString()} ر.ي</p>
          <p className="text-xs text-gray-500">إجمالي الإيرادات</p>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-xs text-red-600 font-medium">+8%</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{expense.toLocaleString()} ر.ي</p>
          <p className="text-xs text-gray-500">إجمالي المصروفات</p>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-gold" />
            </div>
            <span className="text-xs text-gold font-medium">+15%</span>
          </div>
          <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {profit.toLocaleString()} ر.ي
          </p>
          <p className="text-xs text-gray-500">صافي الربح</p>
        </div>
      </div>

      {/* Period Filter */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex gap-2">
          {(['day', 'week', 'month', 'year'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                period === p
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p === 'day' ? 'اليوم' : p === 'week' ? 'الأسبوع' : p === 'month' ? 'الشهر' : 'السنة'}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div className="glass-panel rounded-2xl p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-primary" />
          آخر المعاملات
        </h3>
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>لا توجد معاملات</p>
            </div>
          ) : (
            transactions.slice(0, 20).map((transaction, i) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    transaction.type === 'income' ? 'bg-green-50' : transaction.type === 'expense' ? 'bg-red-50' : 'bg-blue-50'
                  }`}>
                    {transaction.type === 'income' ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : transaction.type === 'expense' ? (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    ) : (
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-xs text-gray-500">{transaction.category}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className={`font-bold ${
                    transaction.type === 'income' ? 'text-green-600' : transaction.type === 'expense' ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                    {Number(transaction.amount).toLocaleString()} ر.ي
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(transaction.createdAt).toLocaleDateString('ar-SA')}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
