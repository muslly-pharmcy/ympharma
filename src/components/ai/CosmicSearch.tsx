import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import {
  Sparkles,
  Search,
  ShieldCheck,
  Loader2,
  Package,
  ShoppingCart,
  Check,
  Lock,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { cosmicSearch } from '@/lib/cosmic-search.functions'
import { addToCart } from '@/lib/cart.functions'
import { supabase } from '@/integrations/supabase/client'

type Match = {
  id: string
  name_ar: string
  brand: string | null
  barcode: string | null
  strength: string | null
  requires_prescription: boolean
}

export function CosmicSearch() {
  const [query, setQuery] = useState('')
  const [addedIds, setAddedIds] = useState<Record<string, number>>({})
  const [flash, setFlash] = useState<string | null>(null)
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null)
  const qc = useQueryClient()

  // Lazy session check on first render
  if (isSignedIn === null && typeof window !== 'undefined') {
    supabase.auth.getUser().then(({ data }) => setIsSignedIn(!!data.user))
  }

  const runSearch = useServerFn(cosmicSearch)
  const runAdd = useServerFn(addToCart)

  const searchMut = useMutation({
    mutationFn: (q: string) => runSearch({ data: { query: q } }),
  })

  const addMut = useMutation({
    mutationFn: (productId: string) => runAdd({ data: { productId, quantity: 1 } }),
    onSuccess: (res, productId) => {
      setAddedIds((prev) => ({ ...prev, [productId]: res.quantity }))
      setFlash('✅ تم تحديث سلة المصلي')
      qc.invalidateQueries({ queryKey: ['cart'] })
      setTimeout(() => setFlash(null), 2500)
    },
    onError: (err: Error) => {
      setFlash(`⚠️ ${err.message}`)
      setTimeout(() => setFlash(null), 3500)
    },
  })

  const submit = () => {
    const q = query.trim()
    if (q.length < 2 || searchMut.isPending) return
    searchMut.mutate(q)
  }

  return (
    <div dir="rtl" className="relative overflow-hidden rounded-3xl p-1">
      {/* Nebula glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-teal-500/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      <div className="relative rounded-3xl border border-white/15 bg-slate-950/60 p-6 backdrop-blur-xl md:p-8">
        <div className="mb-6 flex flex-col items-start gap-2 text-slate-100 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg shadow-teal-900/40">
              <Sparkles className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-lg font-bold">البحث الكوني الذكي</h3>
              <p className="text-xs text-slate-400">اسأل، وأضف مباشرة إلى سلتك — الأدوية بلا وصفة فقط.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" /> قراءة فقط · محمي
          </span>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="مثال: باراسيتامول 500، أو أوجمنتين شراب…"
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-4 pr-11 text-right text-slate-100 placeholder:text-slate-500 focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/30"
              maxLength={300}
            />
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={searchMut.isPending || query.trim().length < 2}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-3 font-bold text-slate-950 shadow-lg shadow-teal-900/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {searchMut.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> جاري التحليل
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> تحليل ذكي
              </>
            )}
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-[12px] text-slate-600">
          <img src="/favicon.svg" alt="شعار صيدلية المصلي" className="h-5 w-5" />
          <span className="font-semibold">صيدلية المصلي</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500">Al-Musalli Pharmacy</span>
        </div>


        {/* Cart flash */}
        <AnimatePresence>
          {flash && (
            <motion.div
              key={flash}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4 flex items-center gap-2 rounded-2xl border border-teal-400/30 bg-teal-500/10 px-4 py-2.5 text-sm text-teal-100 shadow-lg shadow-teal-900/20"
            >
              <Check className="h-4 w-4 text-teal-300" /> {flash}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {searchMut.isError && (
            <motion.div
              key="err"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200"
            >
              تعذّر إكمال الطلب: {(searchMut.error as Error).message}
            </motion.div>
          )}

          {searchMut.data && (
            <motion.div
              key={`ok-${searchMut.data.latencyMs}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 space-y-4"
            >
              <div className="rounded-2xl border border-teal-400/20 bg-teal-500/5 p-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-teal-300">
                  <Sparkles className="h-4 w-4" /> نتائج التحليل الذكي
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">
                  {searchMut.data.answer}
                </p>
                <p className="mt-3 text-[11px] text-slate-500">
                  زمن الاستجابة: {searchMut.data.latencyMs} مللي ثانية
                </p>
              </div>

              {searchMut.data.matches.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {searchMut.data.matches.map((m: Match) => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      isSignedIn={!!isSignedIn}
                      addedQty={addedIds[m.id]}
                      isAdding={addMut.isPending && addMut.variables === m.id}
                      onAdd={() => addMut.mutate(m.id)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function MatchCard({
  match: m,
  isSignedIn,
  addedQty,
  isAdding,
  onAdd,
}: {
  match: Match
  isSignedIn: boolean
  addedQty?: number
  isAdding: boolean
  onAdd: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-teal-500/15">
          <Package className="h-4 w-4 text-teal-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-100">{m.name_ar}</p>
          <p className="text-xs text-slate-400">
            {[m.brand, m.strength].filter(Boolean).join(' · ') || '—'}
          </p>
          {m.barcode && (
            <p className="mt-1 text-[11px] text-slate-500">باركود: {m.barcode}</p>
          )}
        </div>
      </div>

      {m.requires_prescription ? (
        <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200">
          <Lock className="h-3.5 w-3.5" /> يتطلب وصفة طبية
        </div>
      ) : !isSignedIn ? (
        <Link
          to="/auth"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10"
        >
          <Lock className="h-3.5 w-3.5" /> سجّل الدخول للإضافة إلى السلة
        </Link>
      ) : addedQty ? (
        <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200">
          <Check className="h-3.5 w-3.5" /> في السلة ({addedQty})
        </div>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          disabled={isAdding}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 shadow-md shadow-teal-900/30 transition hover:brightness-110 disabled:opacity-50"
        >
          {isAdding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ShoppingCart className="h-3.5 w-3.5" />
          )}
          {isAdding ? 'جاري الإضافة…' : 'أضف إلى السلة'}
        </button>
      )}
    </div>
  )
}

export default CosmicSearch
