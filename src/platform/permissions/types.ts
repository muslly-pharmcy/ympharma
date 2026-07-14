export type Role = "owner" | "admin" | "manager" | "member" | "viewer";

// Permission keys — matches public.permissions seed in Phase 3.
export type Permission =
  | "org.manage"
  | "org.read"
  | "members.manage"
  | "members.read"
  | "branches.manage"
  | "branches.read"
  | "inventory.read"
  | "inventory.update"
  | "orders.read"
  | "orders.manage"
  | "prescriptions.read"
  | "prescriptions.review"
  | "patients.view"
  | "reports.export"
  | "subscriptions.manage"
  | (string & {});
