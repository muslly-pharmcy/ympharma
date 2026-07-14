// Phoenix P7-A — Product Intelligence module barrel (domain + ui only).
// Server functions must be imported from their own paths to keep the client bundle lean.
export * from "./domain/normalize";
export * from "./domain/aliases";
export * from "./domain/schemas";
export type { ProductAlias, ProductMediaRef, SearchHit, MatchKind } from "./domain/types";
export { ProductImage } from "./ui/ProductImage";
