// Compatibility shim — re-exports from src/core/idempotency/IdempotencyService.
// لا تُضِف منطقًا هنا. كل التطوير الجديد يكون داخل src/core/idempotency/.
export {
  IdempotencyService,
  checkIdempotency,
  storeIdempotency,
  sha256Hex,
  type CachedResponse,
  type IdempotencyCheck,
  type IdempotencyCheckParams,
  type IdempotencyStoreParams,
} from "@/core/idempotency/IdempotencyService";
