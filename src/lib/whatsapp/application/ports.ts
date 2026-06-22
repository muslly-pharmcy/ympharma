// Application ports (interfaces) — implementations live under /infrastructure.
import type { Product } from "../domain/Product";

export interface IProductRepository {
  searchByName(query: string, limit: number): Promise<Product[]>;
  findMostAvailable(limit: number): Promise<Product[]>;
}
