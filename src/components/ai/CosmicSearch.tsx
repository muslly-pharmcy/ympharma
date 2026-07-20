import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Sparkles, Search, ShieldCheck, Loader2, Package } from 'lucide-react'
import { cosmicSearch } from '@/lib/cosmic-search.functions'

export function CosmicSearch() {
  const [query, setQuery] = useState('')
  const run = useServerFn(cosmicSearch)

  const mut = useMutation({
    mutationFn: (q: string) => run({ data: { query: q } }),
  })

  const submit = () => {
    const q = query.trim()
    if (q.length < 2 || mut.isPending) return
    mut.mutate(q)
  }

  return (
    <div dir="rtl" className="relative overflow-hidden rounded-3xl p-1">
      {/* Nebula glow layers */}
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
              <p className="text-xs text-slate-400">اسأل عن أي منتج، تركيز، أو باركود — إجابة فورية من كاتالوج الصيدلية.</p>
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
            disabled={mut.isPending || query.trim().length < 2}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-3 font-bold text-slate-950 shadow-lg shadow-teal-900/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mut.isPending ? (
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

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span>Powered by MUSLLY AI · Lovable Cloud</span>
          <span>لا يُخزَّن استعلامك ولا يُشارك مع أطراف خارجية.</span>
        </div>

        <AnimatePresence mode="wait">
          {mut.isError && (
            <motion.div
              key="err"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200"
            >
              تعذّر إكمال الطلب: {(mut.error as Error).message}
            </motion.div>
          )}

          {mut.data && (
            <motion.div
              key={`ok-${mut.data.latencyMs}`}
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
                  {mut.data.answer}
                </p>
                <p className="mt-3 text-[11px] text-slate-500">
                  زمن الاستجابة: {mut.data.latencyMs} مللي ثانية
                </p>
              </div>

              {mut.data.matches.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {mut.data.matches.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-teal-500/15">
                        <Package className="h-4 w-4 text-teal-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-100">{m.name_ar}</p>
                        <p className="text-xs text-slate-400">
                          {[m.brand, m.strength].filter(Boolean).join(' · ') || '—'}
                        </p>
                        {m.barcode && (
                          <p className="mt-1 text-[11px] text-slate-500">باركود: {m.barcode}</p>
                        )}
                      </div>
                    </div>
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

export default CosmicSearch
