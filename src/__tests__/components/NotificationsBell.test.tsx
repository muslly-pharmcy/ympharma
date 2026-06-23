import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from "@tanstack/react-router";

// Stub the server function the bell calls.
vi.mock("@/lib/notifications.functions", () => ({
  getUnreadCount: Object.assign(async () => ({ count: 3 }), { __isServerFn: true }),
}));

// useServerFn in tests just returns the function directly.
vi.mock("@tanstack/react-start", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-start")>("@tanstack/react-start");
  return { ...actual, useServerFn: (fn: any) => fn };
});

import { NotificationsBell } from "@/components/notifications-bell";

function renderWithProviders(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: () => <>{ui}</> });
  const notifRoute = createRoute({ getParentRoute: () => rootRoute, path: "/my-notifications", component: () => <div>notifs</div> });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, notifRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router as any} />
    </QueryClientProvider>,
  );
}

describe("NotificationsBell", () => {
  test("renders bell button with accessible label", async () => {
    renderWithProviders(<NotificationsBell />);
    expect(await screen.findByRole("link", { name: /الإشعارات/ })).toBeInTheDocument();
  });

  test("renders unread count badge", async () => {
    renderWithProviders(<NotificationsBell />);
    expect(await screen.findByText("3")).toBeInTheDocument();
  });
});
