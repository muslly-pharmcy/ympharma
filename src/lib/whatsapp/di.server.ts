// DI container for WhatsApp use cases. Server-only.
import { SupabaseProductRepository } from "./infrastructure/SupabaseProductRepository.server";
import {
  SearchProductsUseCase,
  CheckStockUseCase,
  ListMostAvailableUseCase,
} from "./application/product-use-cases";

const productRepo = new SupabaseProductRepository();

export const whatsappContainer = {
  productRepo,
  searchProducts: new SearchProductsUseCase(productRepo),
  checkStock: new CheckStockUseCase(productRepo),
  listMostAvailable: new ListMostAvailableUseCase(productRepo),
};
