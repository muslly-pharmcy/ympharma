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
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS] | (string & {});
