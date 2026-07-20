import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

function DefaultError({ error }: { error: Error }) {
  return (
    <div className="p-6 text-center text-sm text-red-600">
      {error.message || 'حدث خطأ أثناء تحميل هذه الصفحة.'}
    </div>
  )
}

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    defaultErrorComponent: DefaultError,
  })
}

// Back-compat alias for older call sites.
export const createRouter = getRouter

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}

