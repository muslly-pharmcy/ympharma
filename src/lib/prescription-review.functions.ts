// Phase 6B Sprint 4 — Prescription Review Operations Layer
//
// All review state transitions go through these server functions. UI must
// never write to `prescription_reviews` or `prescription_escalations`
// directly. The DB enforces:
//   - allowed transitions (validate_prescription_review_transition trigger)
//   - event emission via emit_prescription_event (canonical correlation id)
//   - escalation row creation on ESCALATED (open_escalation_on_review trigger)
//
// This file adds:
//   - Authorization (admin | owner | prescriptions permission via RLS)
//   - Idempotency (no-op when already in target state)
//   - Audit log entries (activity_logs)
//   - Friendly errors for invalid transitions

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type ReviewStatus =
  | "PENDING_REVIEW"
  | "ASSIGNED"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "ESCALATED";

type ReviewRow = {
  id: string;
  prescription_id: string;
  status: ReviewStatus;
  reviewer_id: string | null;
  review_notes: string | null;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

const rxIdSchema = z.string().trim().min(3).max(64);
const noteSchema = z.string().trim().min(1).max(2000);
const uuidOpt = z.string().uuid().optional();

function correlationIdFor(prescriptionId: string): string {
  // Mirrors emit_prescription_event: md5('RX-'||id)::uuid
  // Returned to the caller so UI/logs can stitch traces.
  // Cheap deterministic hash — does not need to be cryptographic.
  // We compute it client/server-side in JS too to avoid a roundtrip.
  // (Reference value only; the authoritative correlation_id is stamped
  // by the DB emitter.)
  return `RX-${prescriptionId}`;
}

async function loadReview(
  supabase: any,
  prescriptionId: string,
): Promise<ReviewRow> {
  const { data, error } = await supabase
    .from("prescription_reviews")
    .select(
      "id, prescription_id, status, reviewer_id, review_notes, assigned_at, started_at, completed_at, updated_at",
    )
    .eq("prescription_id", prescriptionId)
    .maybeSingle();
  if (error) {
    if ((error as any).code === "PGRST116" || /permission/i.test(error.message)) {
      throw new Error("forbidden");
    }
    throw new Error(error.message);
  }
  if (!data) throw new Error("review_not_found");
  return data as ReviewRow;
}

async function audit(
  supabase: any,
  action: string,
  prescriptionId: string,
  details: Record<string, unknown>,
) {
  await supabase.from("activity_logs").insert({
    action,
    entity_type: "prescription_review",
    entity_id: prescriptionId,
    details: details as never,
  });
}

async function applyTransition(
  supabase: any,
  current: ReviewRow,
  patch: Partial<Pick<ReviewRow, "status" | "reviewer_id" | "review_notes">>,
): Promise<ReviewRow> {
  const { data, error } = await supabase
    .from("prescription_reviews")
    .update(patch as never)
    .eq("id", current.id)
    .eq("status", current.status) // optimistic guard against races
    .select(
      "id, prescription_id, status, reviewer_id, review_notes, assigned_at, started_at, completed_at, updated_at",
    )
    .maybeSingle();
  if (error) {
    const msg = error.message || "";
    if (msg.includes("invalid_prescription_review_transition")) {
      throw new Error(
        `invalid_transition: ${current.status} -> ${patch.status ?? current.status}`,
      );
    }
    if (/permission|rls/i.test(msg)) throw new Error("forbidden");
    throw new Error(msg);
  }
  if (!data) {
    // Either RLS hid the row or status changed under us. Re-read to report.
    throw new Error("conflict_or_forbidden");
  }
  return data as ReviewRow;
}

// ────────────────────────────────────────────────────────────────────────
// 1. assignPrescriptionReview
// ────────────────────────────────────────────────────────────────────────
export const assignPrescriptionReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        prescriptionId: rxIdSchema,
        reviewerId: uuidOpt, // defaults to caller
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const current = await loadReview(context.supabase, data.prescriptionId);
    const reviewerId = data.reviewerId ?? context.userId;

    // Idempotent: already assigned to this reviewer
    if (current.status === "ASSIGNED" && current.reviewer_id === reviewerId) {
      return {
        ok: true,
        idempotent: true,
        status: current.status,
        correlation_ref: correlationIdFor(data.prescriptionId),
      };
    }

    if (current.status !== "PENDING_REVIEW") {
      throw new Error(`invalid_transition: ${current.status} -> ASSIGNED`);
    }

    const next = await applyTransition(context.supabase, current, {
      status: "ASSIGNED",
      reviewer_id: reviewerId,
    });

    await audit(context.supabase, "prescription_review.assigned", data.prescriptionId, {
      reviewer_id: reviewerId,
      assigned_by: context.userId,
    });

    return {
      ok: true,
      idempotent: false,
      status: next.status,
      reviewer_id: next.reviewer_id,
      correlation_ref: correlationIdFor(data.prescriptionId),
    };
  });

// ────────────────────────────────────────────────────────────────────────
// 2. startPrescriptionReview
// ────────────────────────────────────────────────────────────────────────
export const startPrescriptionReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ prescriptionId: rxIdSchema }).parse(d))
  .handler(async ({ context, data }) => {
    const current = await loadReview(context.supabase, data.prescriptionId);

    if (current.status === "IN_REVIEW" && current.reviewer_id === context.userId) {
      return {
        ok: true,
        idempotent: true,
        status: current.status,
        correlation_ref: correlationIdFor(data.prescriptionId),
      };
    }
    if (current.status !== "ASSIGNED") {
      throw new Error(`invalid_transition: ${current.status} -> IN_REVIEW`);
    }
    // Only the assigned reviewer (or admin/owner) may start.
    // RLS still enforces the role; this is a clearer error for staff.
    if (current.reviewer_id && current.reviewer_id !== context.userId) {
      const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
        context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
        context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" }),
      ]);
      if (!isAdmin && !isOwner) throw new Error("not_assigned_reviewer");
    }

    const next = await applyTransition(context.supabase, current, {
      status: "IN_REVIEW",
      reviewer_id: context.userId,
    });

    await audit(context.supabase, "prescription_review.started", data.prescriptionId, {
      reviewer_id: context.userId,
    });

    return {
      ok: true,
      idempotent: false,
      status: next.status,
      correlation_ref: correlationIdFor(data.prescriptionId),
    };
  });

// ────────────────────────────────────────────────────────────────────────
// 3. approvePrescription
// ────────────────────────────────────────────────────────────────────────
export const approvePrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        prescriptionId: rxIdSchema,
        notes: noteSchema.optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const current = await loadReview(context.supabase, data.prescriptionId);

    if (current.status === "APPROVED") {
      return {
        ok: true,
        idempotent: true,
        status: current.status,
        correlation_ref: correlationIdFor(data.prescriptionId),
      };
    }
    if (current.status !== "IN_REVIEW") {
      throw new Error(`invalid_transition: ${current.status} -> APPROVED`);
    }

    const next = await applyTransition(context.supabase, current, {
      status: "APPROVED",
      review_notes: data.notes ?? current.review_notes,
    });

    await audit(context.supabase, "prescription_review.approved", data.prescriptionId, {
      reviewer_id: context.userId,
      notes: data.notes ?? null,
    });

    return {
      ok: true,
      idempotent: false,
      status: next.status,
      correlation_ref: correlationIdFor(data.prescriptionId),
    };
  });

// ────────────────────────────────────────────────────────────────────────
// 4. rejectPrescription
// ────────────────────────────────────────────────────────────────────────
export const rejectPrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        prescriptionId: rxIdSchema,
        reason: noteSchema, // required for audit
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const current = await loadReview(context.supabase, data.prescriptionId);

    if (current.status === "REJECTED") {
      return {
        ok: true,
        idempotent: true,
        status: current.status,
        correlation_ref: correlationIdFor(data.prescriptionId),
      };
    }
    if (current.status !== "IN_REVIEW") {
      throw new Error(`invalid_transition: ${current.status} -> REJECTED`);
    }

    const next = await applyTransition(context.supabase, current, {
      status: "REJECTED",
      review_notes: data.reason,
    });

    await audit(context.supabase, "prescription_review.rejected", data.prescriptionId, {
      reviewer_id: context.userId,
      reason: data.reason,
    });

    return {
      ok: true,
      idempotent: false,
      status: next.status,
      correlation_ref: correlationIdFor(data.prescriptionId),
    };
  });

// ────────────────────────────────────────────────────────────────────────
// 5. escalatePrescription
//    DB trigger (open_escalation_on_review) inserts the escalation row;
//    here we only pass the reason via review_notes so the trigger can
//    persist it. We also write an explicit escalation row to capture
//    `assigned_to` when the caller routes the escalation.
// ────────────────────────────────────────────────────────────────────────
export const escalatePrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        prescriptionId: rxIdSchema,
        reason: noteSchema,
        assignedTo: uuidOpt,
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const current = await loadReview(context.supabase, data.prescriptionId);

    if (current.status === "ESCALATED") {
      return {
        ok: true,
        idempotent: true,
        status: current.status,
        correlation_ref: correlationIdFor(data.prescriptionId),
      };
    }
    if (current.status !== "IN_REVIEW") {
      throw new Error(`invalid_transition: ${current.status} -> ESCALATED`);
    }

    const next = await applyTransition(context.supabase, current, {
      status: "ESCALATED",
      review_notes: data.reason,
    });

    // Add a routed escalation row only when caller specifies an owner;
    // the DB trigger already opens a default OPEN row on this transition,
    // so we only add a second row when there's an explicit assignment.
    if (data.assignedTo) {
      const { error: insErr } = await context.supabase
        .from("prescription_escalations")
        .insert({
          prescription_id: data.prescriptionId,
          reason: data.reason,
          assigned_to: data.assignedTo,
          created_by: context.userId,
          status: "OPEN",
        } as never);
      if (insErr && !/duplicate/i.test(insErr.message)) {
        throw new Error(insErr.message);
      }
    }

    await audit(context.supabase, "prescription_review.escalated", data.prescriptionId, {
      reviewer_id: context.userId,
      reason: data.reason,
      assigned_to: data.assignedTo ?? null,
    });

    return {
      ok: true,
      idempotent: false,
      status: next.status,
      correlation_ref: correlationIdFor(data.prescriptionId),
    };
  });

// ────────────────────────────────────────────────────────────────────────
// 6. returnEscalatedToReview
//    Moves an ESCALATED review back to IN_REVIEW and resolves any open
//    escalation rows with a resolution note.
// ────────────────────────────────────────────────────────────────────────
export const returnEscalatedToReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        prescriptionId: rxIdSchema,
        resolutionNote: noteSchema.optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const current = await loadReview(context.supabase, data.prescriptionId);

    if (current.status === "IN_REVIEW") {
      return {
        ok: true,
        idempotent: true,
        status: current.status,
        correlation_ref: correlationIdFor(data.prescriptionId),
      };
    }
    if (current.status !== "ESCALATED") {
      throw new Error(`invalid_transition: ${current.status} -> IN_REVIEW`);
    }

    const next = await applyTransition(context.supabase, current, {
      status: "IN_REVIEW",
      reviewer_id: context.userId,
    });

    // Resolve any OPEN escalations for this prescription
    const { error: resolveErr } = await context.supabase
      .from("prescription_escalations")
      .update({
        status: "RESOLVED",
        resolution_note: data.resolutionNote ?? "returned_to_review",
        resolved_at: new Date().toISOString(),
      } as never)
      .eq("prescription_id", data.prescriptionId)
      .eq("status", "OPEN");
    if (resolveErr) throw new Error(resolveErr.message);

    await audit(
      context.supabase,
      "prescription_review.returned_to_review",
      data.prescriptionId,
      {
        reviewer_id: context.userId,
        resolution_note: data.resolutionNote ?? null,
      },
    );

    return {
      ok: true,
      idempotent: false,
      status: next.status,
      correlation_ref: correlationIdFor(data.prescriptionId),
    };
  });

// ────────────────────────────────────────────────────────────────────────
// Read helper for admin UI (Sprint 5 will build on this)
// ────────────────────────────────────────────────────────────────────────
export const getPrescriptionReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ prescriptionId: rxIdSchema }).parse(d))
  .handler(async ({ context, data }) => {
    const review = await loadReview(context.supabase, data.prescriptionId);
    const { data: escalations, error: escErr } = await context.supabase
      .from("prescription_escalations")
      .select(
        "id, reason, assigned_to, status, resolution_note, created_by, created_at, resolved_at",
      )
      .eq("prescription_id", data.prescriptionId)
      .order("created_at", { ascending: false });
    if (escErr) throw new Error(escErr.message);
    return {
      review,
      escalations: escalations ?? [],
      correlation_ref: correlationIdFor(data.prescriptionId),
    };
  });

// ────────────────────────────────────────────────────────────────────────
// listPrescriptionReviews — paginated, server-side filtered list.
// ────────────────────────────────────────────────────────────────────────
const REVIEW_STATUSES = [
  "PENDING_REVIEW",
  "ASSIGNED",
  "IN_REVIEW",
  "ESCALATED",
  "APPROVED",
  "REJECTED",
] as const;

export type PrescriptionReviewListRow = {
  prescription_id: string;
  status: ReviewStatus;
  reviewer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  prescription_created_at: string | null;
  updated_at: string;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  correlation_ref: string;
};

export const listPrescriptionReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        status: z.enum(REVIEW_STATUSES).optional(),
        search: z.string().trim().max(120).optional(),
        limit: z.number().int().min(1).max(100).default(25),
        offset: z.number().int().min(0).default(0),
      })
      .parse(d ?? {}),
  )
  .handler(
    async ({
      context,
      data,
    }): Promise<{ rows: PrescriptionReviewListRow[]; total: number }> => {
      let q = context.supabase
        .from("prescription_reviews")
        .select(
          "prescription_id, status, reviewer_id, updated_at, assigned_at, started_at, completed_at, prescriptions!inner(customer_name, customer_phone, created_at)",
          { count: "exact" },
        )
        .order("updated_at", { ascending: false })
        .range(data.offset, data.offset + data.limit - 1);
      if (data.status) q = q.eq("status", data.status);
      if (data.search) {
        const s = data.search.replace(/[%,]/g, "");
        q = q.ilike("prescription_id", `%${s}%`);
      }
      const { data: rows, error, count } = await q;
      if (error) {
        if (/permission|rls/i.test(error.message)) throw new Error("forbidden");
        throw new Error(error.message);
      }
      const mapped: PrescriptionReviewListRow[] = ((rows as any[]) ?? []).map((r) => ({
        prescription_id: r.prescription_id,
        status: r.status,
        reviewer_id: r.reviewer_id,
        customer_name: r.prescriptions?.customer_name ?? null,
        customer_phone: r.prescriptions?.customer_phone ?? null,
        prescription_created_at: r.prescriptions?.created_at ?? null,
        updated_at: r.updated_at,
        assigned_at: r.assigned_at,
        started_at: r.started_at,
        completed_at: r.completed_at,
        correlation_ref: `RX-${r.prescription_id}`,
      }));
      return { rows: mapped, total: count ?? 0 };
    },
  );

// ────────────────────────────────────────────────────────────────────────
// getPrescriptionReviewDetail — review + escalations + files + timeline
// (agent_events ∪ activity_logs ∪ escalations), sorted chronologically.
// ────────────────────────────────────────────────────────────────────────
export type TimelineEntry = {
  at: string;
  kind: "event" | "activity" | "escalation";
  label: string;
  details: Record<string, unknown> | null;
};

export type PrescriptionFileLite = {
  id: string;
  bucket: string;
  object_path: string;
  mime_type: string | null;
  size_bytes: number;
  created_at: string;
};

export const getPrescriptionReviewDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ prescriptionId: rxIdSchema }).parse(d))
  .handler(async ({ context, data }) => {
    const review = await loadReview(context.supabase, data.prescriptionId);

    const [rxRes, escRes, evtRes, actRes, fileRes] = await Promise.all([
      context.supabase
        .from("prescriptions")
        .select("id, customer_name, customer_phone, customer_address, notes, created_at")
        .eq("id", data.prescriptionId)
        .maybeSingle(),
      context.supabase
        .from("prescription_escalations")
        .select(
          "id, reason, assigned_to, status, resolution_note, created_by, created_at, resolved_at",
        )
        .eq("prescription_id", data.prescriptionId)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("agent_events")
        .select("id, event_name, created_at, payload, source, correlation_id")
        .eq("entity_type", "prescription")
        .eq("entity_id", data.prescriptionId)
        .order("created_at", { ascending: true })
        .limit(200),
      context.supabase
        .from("activity_logs")
        .select("id, action, details, created_at")
        .eq("entity_type", "prescription_review")
        .eq("entity_id", data.prescriptionId)
        .order("created_at", { ascending: true })
        .limit(200),
      context.supabase
        .from("prescription_files" as never)
        .select("id, bucket, object_path, mime_type, size_bytes, created_at")
        .eq("prescription_id", data.prescriptionId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ]);

    for (const r of [rxRes, escRes, evtRes, actRes, fileRes] as any[]) {
      if (r.error) {
        if (/permission|rls/i.test(r.error.message)) throw new Error("forbidden");
        throw new Error(r.error.message);
      }
    }

    const timeline: TimelineEntry[] = [];
    for (const e of (evtRes.data as any[]) ?? []) {
      timeline.push({
        at: e.created_at,
        kind: "event",
        label: e.event_name,
        details: { source: e.source, payload: e.payload },
      });
    }
    for (const a of (actRes.data as any[]) ?? []) {
      timeline.push({
        at: a.created_at,
        kind: "activity",
        label: a.action,
        details: (a.details as any) ?? null,
      });
    }
    for (const e of (escRes.data as any[]) ?? []) {
      timeline.push({
        at: e.created_at,
        kind: "escalation",
        label: `escalation.${String(e.status).toLowerCase()}`,
        details: {
          reason: e.reason,
          assigned_to: e.assigned_to,
          resolution_note: e.resolution_note,
          resolved_at: e.resolved_at,
        },
      });
    }
    timeline.sort((a, b) => a.at.localeCompare(b.at));

    return {
      review,
      prescription: (rxRes.data as any) ?? null,
      escalations: ((escRes.data as any[]) ?? []) as Array<{
        id: string;
        reason: string;
        assigned_to: string | null;
        status: "OPEN" | "RESOLVED" | "CANCELLED";
        resolution_note: string | null;
        created_by: string | null;
        created_at: string;
        resolved_at: string | null;
      }>,
      files: ((fileRes.data as any[]) ?? []) as PrescriptionFileLite[],
      timeline,
      correlation_ref: correlationIdFor(data.prescriptionId),
    };
  });
