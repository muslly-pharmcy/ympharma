import { createFileRoute, useNavigate, useSearch, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useEffect } from 'react'

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(['signin', 'signup']).optional(),
})

export const Route = createFileRoute('/auth')({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: 'تسجيل الدخول — MUSLLY AI OS' },
      { name: 'description', content: 'سجّل الدخول أو أنشئ حسابًا في MUSLLY AI OS.' },
    ],
  }),
  component: AuthPage,
})

const credentialsSchema = z.object({
  email: z.string().trim().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
})

const DEFAULT_REDIRECT = '/catalog'

// Accept only internal, single-slash paths. Reject:
// - absolute URLs (http:, https:, javascript:, data:, mailto:, tel:, ...)
// - protocol-relative (//host, /\host) that some browsers normalize to hosts
// - control chars, whitespace, or excessive length that could smuggle URLs
// - percent-encoded slashes / backslashes that decode into `//` or `/\`
function safeRedirect(raw?: string): string {
  if (!raw || typeof raw !== 'string') return DEFAULT_REDIRECT
  if (raw.length > 512) return DEFAULT_REDIRECT
  if (/[\s\u0000-\u001f\u007f]/.test(raw)) return DEFAULT_REDIRECT

  let decoded = raw
  try {
    // Decode once to catch %2f%2fevil.com and %5cevil.com style bypasses.
    decoded = decodeURIComponent(raw)
  } catch {
    return DEFAULT_REDIRECT
  }

  if (!decoded.startsWith('/')) return DEFAULT_REDIRECT
  if (decoded.startsWith('//') || decoded.startsWith('/\\')) return DEFAULT_REDIRECT
  if (decoded.startsWith('/auth')) return DEFAULT_REDIRECT // avoid redirect loops
  return raw
}

function AuthPage() {
  const search = useSearch({ from: '/auth' })
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>(search.mode ?? 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const redirectTo = safeRedirect(search.redirect)

  useEffect(() => {
    if (isAuthenticated) {
      void navigate({ to: redirectTo, replace: true })
    }
  }, [isAuthenticated, navigate, redirectTo])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    const parsed = credentialsSchema.safeParse({ email, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'مدخلات غير صالحة')
      return
    }
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword(parsed.data)
        if (error) throw error
        void navigate({ to: redirectTo, replace: true })
      } else {
        const { error } = await supabase.auth.signUp({
          ...parsed.data,
          options: { emailRedirectTo: `${window.location.origin}${redirectTo}` },
        })
        if (error) throw error
        setInfo('تم إنشاء الحساب. تحقّق من بريدك لتأكيد التسجيل.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع')
    } finally {
      setBusy(false)
    }
  }

  async function handleForgot() {
    setError(null); setInfo(null)
    if (!email) return setError('أدخل البريد الإلكتروني أولًا')
    setBusy(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setInfo('تم إرسال رابط استعادة كلمة المرور إلى بريدك.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الإرسال')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">MUSLLY AI OS</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === 'signin' ? 'تسجيل الدخول إلى حسابك' : 'إنشاء حساب جديد'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel space-y-4 rounded-2xl p-6">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">البريد الإلكتروني</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            dir="ltr"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">كلمة المرور</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            dir="ltr"
          />
        </label>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {info && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{info}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {busy ? '...' : mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
        </button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-primary hover:underline"
          >
            {mode === 'signin' ? 'إنشاء حساب جديد' : 'لديّ حساب — تسجيل الدخول'}
          </button>
          {mode === 'signin' && (
            <button type="button" onClick={handleForgot} className="text-muted-foreground hover:underline">
              نسيت كلمة المرور؟
            </button>
          )}
        </div>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        <Link to="/" className="hover:underline">العودة للصفحة الرئيسية</Link>
      </p>
    </div>
  )
}
