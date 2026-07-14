export type Role = "owner" | "admin" | "manager" | "member" | "viewer";

// Permission strings use dotted namespacing: "<domain>.<action>".
// Add entries here as modules onboard; treat as an open string on the type side.
export type Permission =
  | "admin.read"
  | "admin.write"
  | "org.manage"
  | "org.members.read"
  | "org.members.write"
  | (string & {});
