// Phoenix Phase 3 — identity event payload schemas.
import { z } from "zod";

export const IdentityEventPayload = z.object({
  org_id: z.string().uuid().nullable().optional(),
  actor_user_id: z.string().uuid().nullable().optional(),
  subject_user_id: z.string().uuid().nullable().optional(),
  branch_id: z.string().uuid().nullable().optional(),
  data: z.record(z.string(), z.any()).default({}),
});

export type IdentityEventPayload = z.infer<typeof IdentityEventPayload>;

export const IDENTITY_EVENTS = [
  "USER_CREATED",
  "USER_UPDATED",
  "PROFILE_COMPLETED",
  "ORGANIZATION_MEMBER_ADDED",
  "ORGANIZATION_MEMBER_REMOVED",
  "ROLE_CHANGED",
  "BRANCH_CREATED",
  "BRANCH_UPDATED",
  "BRANCH_MEMBER_ASSIGNED",
  "BRANCH_MEMBER_UNASSIGNED",
] as const;

export type IdentityEventName = (typeof IDENTITY_EVENTS)[number];
