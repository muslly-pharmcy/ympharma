// Thin re-export layer so platform/module code depends on `@/platform/observability`
// rather than reaching into `@/core/observability` directly.
export { logger, Logger } from "@/core/observability/Logger";
export { buildRequestContext, type RequestContext } from "@/core/observability/RequestContext";
export { withObservability } from "@/core/observability/withObservability";
