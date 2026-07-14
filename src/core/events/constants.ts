// ============================================================
// Canonical event names — extend cautiously; keep past ⇒ preterite verb form.
// ============================================================

export const EVENTS = {
  ORDER_CREATED: "order.created",
  ORDER_CANCELLED: "order.cancelled",
  PAYMENT_COMPLETED: "payment.completed",
  PAYMENT_FAILED: "payment.failed",
  INVENTORY_UPDATED: "inventory.updated",
  INVENTORY_LOW_STOCK: "inventory.low_stock",
  PRESCRIPTION_RECEIVED: "prescription.received",
  PRESCRIPTION_APPROVED: "prescription.approved",
  USER_REGISTERED: "user.registered",
  USER_INVITED: "user.invited",
  // ---- Phoenix Phase 3: Identity ----
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  PROFILE_COMPLETED: "PROFILE_COMPLETED",
  ORGANIZATION_MEMBER_ADDED: "ORGANIZATION_MEMBER_ADDED",
  ORGANIZATION_MEMBER_REMOVED: "ORGANIZATION_MEMBER_REMOVED",
  ROLE_CHANGED: "ROLE_CHANGED",
  BRANCH_CREATED: "BRANCH_CREATED",
  BRANCH_UPDATED: "BRANCH_UPDATED",
  BRANCH_MEMBER_ASSIGNED: "BRANCH_MEMBER_ASSIGNED",
  BRANCH_MEMBER_UNASSIGNED: "BRANCH_MEMBER_UNASSIGNED",
  // ---- Phoenix Phase 4: Catalog ----
  PRODUCT_CREATED: "PRODUCT_CREATED",
  PRODUCT_UPDATED: "PRODUCT_UPDATED",
  PRODUCT_VERIFIED: "PRODUCT_VERIFIED",
  PRODUCT_IMAGE_ADDED: "PRODUCT_IMAGE_ADDED",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS] | (string & {});
