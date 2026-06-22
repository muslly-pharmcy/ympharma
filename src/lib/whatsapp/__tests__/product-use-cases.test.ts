import { describe, it, expect } from "vitest";
import { Product } from "../domain/Product";
import { PhoneNumber, Money, StockQuantity } from "../domain/value-objects";
import {
  SearchProductsUseCase,
  CheckStockUseCase,
  ListMostAvailableUseCase,
  formatProductList,
  formatStockStatus,
  formatMostAvailable,
} from "../application/product-use-cases";
import type { IProductRepository } from "../application/ports";

class InMemoryProductRepository implements IProductRepository {
  constructor(private readonly products: Product[]) {}
  async searchByName(query: string, limit: number): Promise<Product[]> {
    return this.products
      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.stockQty - a.stockQty)
      .slice(0, limit);
  }
  async findMostAvailable(limit: number): Promise<Product[]> {
    return [...this.products].sort((a, b) => b.stockQty - a.stockQty).slice(0, limit);
  }
}

const mkProducts = () => [
  Product.create({ id: "1", name: "بنادول 500", price: 800, stock: 25 }),
  Product.create({ id: "2", name: "بنادول إكسترا", price: 1200, stock: 5 }),
  Product.create({ id: "3", name: "بروفين 400", price: 900, stock: 0 }),
  Product.create({ id: "4", name: "فيتامين د", price: 2500, stock: 50 }),
];

describe("WhatsApp domain value objects", () => {
  it("PhoneNumber normalizes and validates", () => {
    expect(PhoneNumber.create("967782878280").toString()).toBe("+967782878280");
    expect(PhoneNumber.create("+967782878280").toString()).toBe("+967782878280");
    expect(() => PhoneNumber.create("abc")).toThrow();
  });

  it("Money rejects negatives", () => {
    expect(new Money(100).toString()).toBe("100 ر.ي");
    expect(() => new Money(-1)).toThrow();
  });

  it("StockQuantity emoji thresholds: 🟢>10, 🟡 1–10, 🔴 0", () => {
    expect(new StockQuantity(25).emoji()).toBe("🟢");
    expect(new StockQuantity(11).emoji()).toBe("🟢");
    expect(new StockQuantity(10).emoji()).toBe("🟡");
    expect(new StockQuantity(1).emoji()).toBe("🟡");
    expect(new StockQuantity(0).emoji()).toBe("🔴");
  });
});

describe("Product use cases", () => {
  it("SearchProductsUseCase returns matches sorted by stock desc", async () => {
    const repo = new InMemoryProductRepository(mkProducts());
    const uc = new SearchProductsUseCase(repo);
    const res = await uc.execute("بنادول", 5);
    expect(res.map((p) => p.id)).toEqual(["1", "2"]);
  });

  it("SearchProductsUseCase ignores empty query", async () => {
    const repo = new InMemoryProductRepository(mkProducts());
    const res = await new SearchProductsUseCase(repo).execute("  ", 5);
    expect(res).toEqual([]);
  });

  it("CheckStockUseCase limits results", async () => {
    const repo = new InMemoryProductRepository(mkProducts());
    const res = await new CheckStockUseCase(repo).execute("بنادول", 1);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe("1");
  });

  it("ListMostAvailableUseCase sorts by stock desc", async () => {
    const repo = new InMemoryProductRepository(mkProducts());
    const res = await new ListMostAvailableUseCase(repo).execute(3);
    expect(res.map((p) => p.id)).toEqual(["4", "1", "2"]);
  });
});

describe("WhatsApp reply formatters", () => {
  const sample = mkProducts().slice(0, 3);

  it("formatProductList contains numbered list + emoji + YER + CTA", () => {
    const text = formatProductList(sample);
    expect(text).toMatch(/^✅/);
    expect(text).toMatch(/1\. بنادول 500/);
    expect(text).toMatch(/🟢|🟡|🔴/);
    expect(text).toMatch(/ر\.ي/);
    expect(text).not.toMatch(/ر\.س/);
    expect(text).toMatch(/💡 للطلب/);
  });

  it("formatStockStatus marks unavailable items", () => {
    const text = formatStockStatus(sample);
    expect(text).toMatch(/غير متوفر/);
    expect(text).toMatch(/متوفر \(25\)/);
  });

  it("formatMostAvailable uses ر.ي and stock emoji", () => {
    const text = formatMostAvailable(sample);
    expect(text).toMatch(/🏆/);
    expect(text).toMatch(/ر\.ي/);
    expect(text).not.toMatch(/ر\.س/);
  });

  it("empty product list returns a fallback message", () => {
    expect(formatProductList([])).toMatch(/لا توجد نتائج/);
    expect(formatMostAvailable([])).toMatch(/لا توجد منتجات/);
  });
});
