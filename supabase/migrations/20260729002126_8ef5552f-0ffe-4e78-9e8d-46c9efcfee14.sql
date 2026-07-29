DROP POLICY IF EXISTS vr_submitter_insert ON public.hc_verification_requests;
CREATE POLICY vr_submitter_insert ON public.hc_verification_requests
FOR INSERT TO authenticated
WITH CHECK (
  submitted_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.hc_doctors d
    WHERE d.id = hc_verification_requests.doctor_id
      AND (
        d.user_id = auth.uid()
        OR (d.organization_id IS NOT NULL AND public.has_org_permission(auth.uid(), d.organization_id, 'healthcare.doctors.verify'))
      )
  )
);