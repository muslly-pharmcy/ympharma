
-- 1) Restrict Realtime channel subscriptions
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can subscribe to orders/prescriptions topics" ON realtime.messages;
CREATE POLICY "Staff can subscribe to orders/prescriptions topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() IN ('orders', 'public:orders') THEN
      public.has_role(auth.uid(), 'owner')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_permission(auth.uid(), 'orders')
    WHEN realtime.topic() IN ('prescriptions', 'public:prescriptions') THEN
      public.has_role(auth.uid(), 'owner')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_permission(auth.uid(), 'prescriptions')
    ELSE false
  END
);

-- 2) Activity logs INSERT policy (writes still happen via SECURITY DEFINER fns/triggers,
--    but make the rule explicit so direct inserts cannot be forged for another user)
DROP POLICY IF EXISTS "Users can insert own activity entries" ON public.activity_logs;
CREATE POLICY "Users can insert own activity entries"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (actor_id = auth.uid());

-- 3) Storage policies for prescriptions bucket (UPDATE + DELETE)
DROP POLICY IF EXISTS "Staff can update prescription files" ON storage.objects;
CREATE POLICY "Staff can update prescription files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'prescriptions'
  AND (
    public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_permission(auth.uid(), 'prescriptions')
  )
)
WITH CHECK (
  bucket_id = 'prescriptions'
  AND (
    public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_permission(auth.uid(), 'prescriptions')
  )
);

DROP POLICY IF EXISTS "Staff can delete prescription files" ON storage.objects;
CREATE POLICY "Staff can delete prescription files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'prescriptions'
  AND (
    public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_permission(auth.uid(), 'prescriptions')
  )
);
