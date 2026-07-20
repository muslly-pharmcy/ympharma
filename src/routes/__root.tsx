import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouter,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import MainLayout from '@/layouts/MainLayout'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { AIProvider } from '@/context/AIContext'
import { supabase } from '@/integrations/supabase/client'
import appCss from '@/index.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'MUSLLY AI OS — Intelligent Pharmacy Operating System' },
      {
        name: 'description',
        content:
          'MUSLLY AI OS is an AI-native pharmacy operating system for medication management, doctors, inventory, delivery, and analytics.',
      },
      { property: 'og:title', content: 'MUSLLY AI OS' },
      {
        property: 'og:description',
        content:
          'AI-native operating system for pharmacies, doctors, and healthcare networks.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: RootNotFound,
  errorComponent: RootError,
})

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootComponent() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      }),
  )
  return (
    <QueryClientProvider client={queryClient}>
      <AuthStateSync />
      <ThemeProvider>
        <AuthProvider>
          <AIProvider>
            <MainLayout>
              <Outlet />
            </MainLayout>
          </AIProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

// Wire Supabase auth events into the router + query cache exactly once.
// Filter to identity transitions to avoid churn on TOKEN_REFRESHED / INITIAL_SESSION.
function AuthStateSync() {
  const router = useRouter()
  const queryClient = useQueryClient()
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'USER_UPDATED') return
      void router.invalidate()
      if (event !== 'SIGNED_OUT') void queryClient.invalidateQueries()
    })
    return () => sub.subscription.unsubscribe()
  }, [router, queryClient])
  return null
}

function RootNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <h1 className="text-3xl font-bold">الصفحة غير موجودة</h1>
      <p className="text-muted-foreground">
        الرابط الذي طلبته غير متاح أو تم نقله.
      </p>
      <Link
        to="/"
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
      >
        العودة للرئيسية
      </Link>
    </div>
  )
}

function RootError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter()
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <h1 className="text-2xl font-bold text-destructive">حدث خطأ غير متوقع</h1>
      <p className="max-w-lg text-sm text-muted-foreground">{error.message}</p>
      <button
        type="button"
        onClick={() => {
          reset()
          void router.invalidate()
        }}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
      >
        إعادة المحاولة
      </button>
    </div>
  )
}
