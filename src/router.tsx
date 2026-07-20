import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
  })
}

// Back-compat alias for older call sites (e.g. src/main.tsx).
export const createRouter = getRouter

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
