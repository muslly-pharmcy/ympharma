import type { IProductRepository } from "./ports";
import type { Product } from "../domain/Product";

export class SearchProductsUseCase {
  constructor(private readonly repo: IProductRepository) {}
  async execute(query: string, limit = 6): Promise<Product[]> {
    if (!query.trim()) return [];
    return this.repo.searchByName(query.trim(), limit);
  }
}

export class CheckStockUseCase {
  constructor(private readonly repo: IProductRepository) {}
  async execute(productName: string, limit = 3): Promise<Product[]> {
    if (!productName.trim()) return [];
    return this.repo.searchByName(productName.trim(), limit);
  }
}

export class ListMostAvailableUseCase {
  constructor(private readonly repo: IProductRepository) {}
  async execute(limit = 6): Promise<Product[]> {
    return this.repo.findMostAvailable(limit);
  }
}

// Pure formatters — keep here so use cases produce consistent WhatsApp replies.
export function formatProductList(products: Product[]): string {
  if (products.length === 0) return "🔍 لا توجد نتائج.";
  let out = "✅ نتائج البحث (الأكثر توفراً أولاً):\n";
  products.forEach((p, i) => {
    out += `${i + 1}. ${p.name} — ${p.formattedPrice} | 📦 ${p.stockQty} ${p.stockEmoji}\n`;
  });
  out += '\n💡 للطلب أرسل: "طلب <اسم المنتج>"';
  return out;
}

export function formatStockStatus(products: Product[]): string {
  if (products.length === 0) return "💊 لا توجد معلومات عن هذا المنتج.";
  let out = "📦 المخزون الحالي (الأكثر توفراً أولاً):\n";
  products.forEach((p, i) => {
    const status = p.isAvailable() ? `متوفر (${p.stockQty})` : "غير متوفر";
    out += `${i + 1}. ${p.name} — ${status} ${p.stockEmoji} | السعر: ${p.formattedPrice}\n`;
  });
  out += '\n💡 للطلب أرسل: "طلب <اسم المنتج>"';
  return out;
}

export function formatMostAvailable(products: Product[]): string {
  if (products.length === 0) return "📦 لا توجد منتجات مسجلة.";
  let out = "🏆 المنتجات الأكثر توفراً:\n";
  products.forEach((p, i) => {
    out += `${i + 1}. ${p.name} — ${p.stockQty} وحدة ${p.stockEmoji} (${p.formattedPrice})\n`;
  });
  out += '\n💡 للطلب أرسل: "طلب <اسم المنتج>"';
  return out;
}
