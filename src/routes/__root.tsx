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
import { Suspense, useEffect, useState } from 'react'
import MainLayout from '@/layouts/MainLayout'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { AIProvider } from '@/context/AIContext'
import { supabase } from '@/integrations/supabase/client'
import { BottomNav } from '@/shared/components/BottomNav'
import { ModuleErrorBoundary } from '@/components/errors/ErrorBoundary'
import { ErrorScreen } from '@/components/errors/ErrorScreen'
import { RouteSkeleton } from '@/components/skeletons/Skeleton'
import { classifyError } from '@/lib/errors/classify'
import { newCorrelationId } from '@/lib/errors/correlation'
import { reportError } from '@/lib/errors/logger'
import appCss from '@/index.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#005D4F' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { title: 'صيدلية المصلي — Al-Musalli Pharmacy | رعاية دوائية ذكية في عدن' },
      {
        name: 'description',
        content:
          'صيدلية المصلي في عدن — صرف الوصفات، توصيل الأدوية، دليل طبي، ومساعد ذكاء صناعي على مدار الساعة.',
      },
      { property: 'og:title', content: 'صيدلية المصلي — Al-Musalli Pharmacy' },
      {
        property: 'og:description',
        content:
          'رعاية دوائية موثوقة في عدن مع مساعد ذكاء صناعي، صرف الوصفات، وتوصيل الأدوية.',
      },
      { property: 'og:site_name', content: 'صيدلية المصلي' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'صيدلية المصلي — Al-Musalli Pharmacy' },
      { name: 'twitter:description', content: 'رعاية دوائية ذكية في عدن.' },

    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'apple-touch-icon', href: '/favicon.svg' },
    ],
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
              <ModuleErrorBoundary boundary="root:outlet" variant="page">
                <Suspense fallback={<RouteSkeleton />}>
                  <Outlet />
                </Suspense>
              </ModuleErrorBoundary>
            </MainLayout>
            <BottomNav />
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
  const classified = classifyError(error)
  const correlationId = newCorrelationId('root')
  reportError({ correlationId, classified, boundary: 'root' })
  return (
    <div className="min-h-dvh bg-background">
      <ErrorScreen
        classified={classified}
        correlationId={correlationId}
        boundary="root"
        variant="page"
        onRetry={() => {
          reset()
          void router.invalidate()
        }}
      />
    </div>
  )
}
