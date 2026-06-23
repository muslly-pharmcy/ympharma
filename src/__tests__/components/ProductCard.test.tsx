import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider, Outlet } from "@tanstack/react-router";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/products";

// Cart hook writes to localStorage; we just need a no-op stable mock.
vi.mock("@/lib/cart", () => ({
  useCart: () => ({ add: vi.fn(), remove: vi.fn(), items: [] }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderWithRouter(ui: React.ReactNode) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: () => <>{ui}</> });
  const productRoute = createRoute({ getParentRoute: () => rootRoute, path: "/product/$id", component: () => <div>product</div> });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, productRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router as any} />);
}

const product: Product = {
  id: 1,
  name: "بنادول إكسترا",
  brand: "GSK",
  price: 250,
  cat: "medicine",
  img: "/test.jpg",
};

const fmt = (n: number) => n.toLocaleString("ar-EG");

describe("ProductCard", () => {
  beforeEach(() => vi.clearAllMocks());

  test("renders product name and brand", async () => {
    renderWithRouter(<ProductCard product={product} />);
    expect(await screen.findByText("بنادول إكسترا")).toBeInTheDocument();
    expect(screen.getByText("GSK")).toBeInTheDocument();
  });

  test("renders formatted price", async () => {
    renderWithRouter(<ProductCard product={product} />);
    expect(await screen.findByText(/250/)).toBeInTheDocument();
    expect(screen.getByText(/ر\.ي/)).toBeInTheDocument();
  });

  test("renders old price when present", async () => {
    renderWithRouter(<ProductCard product={{ ...product, oldPrice: 300 }} />);
    expect(await screen.findByText(/300/)).toBeInTheDocument();
  });

  test("add-to-cart button is accessible and clickable", async () => {
    renderWithRouter(<ProductCard product={product} />);
    const btn = await screen.findByRole("button", { name: /أضف إلى السلة/ });
    await userEvent.click(btn);
    expect(btn).toBeInTheDocument();
  });
});
