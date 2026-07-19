import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import MainLayout from '@/layouts/MainLayout'

export const Route = createRootRoute({
  component: () => (
    <>
      <MainLayout>
        <Outlet />
      </MainLayout>
      {process.env.NODE_ENV === 'development' && <TanStackRouterDevtools />}
    </>
  ),
})
