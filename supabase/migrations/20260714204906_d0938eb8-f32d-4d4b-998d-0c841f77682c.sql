
-- =========================================================================
-- PHOENIX OMEGA S1: Doctor Network Foundation
-- Purely additive. No drops. No renames.
-- =========================================================================

-- ---------- ENUMS (idempotent) ----------
DO $$ BEGIN
  CREATE TYPE public.hc_practice_type AS ENUM (
    'gov_hospital','private_hospital','military_hospital','teaching_hospital',
    'clinic','medical_center','charity','ngo'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hc_booking_method AS ENUM (
    'walk_in','phone','whatsapp','online','assistant'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hc_join_status AS ENUM (
    'new','reviewing','approved','rejected','duplicate'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- EXTEND hc_doctors ----------
ALTER TABLE public.hc_doctors
  ADD COLUMN IF NOT EXISTS academic_title text,
  ADD COLUMN IF NOT EXISTS medical_title text,
  ADD COLUMN IF NOT EXISTS sub_specialties text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS certificates jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS awards jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS services jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS accepted_insurance uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS consultation_fee_min numeric,
  ADD COLUMN IF NOT EXISTS consultation_fee_max numeric,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'YER',
  ADD COLUMN IF NOT EXISTS gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS intro_video_url text,
  ADD COLUMN IF NOT EXISTS qr_token text,
  ADD COLUMN IF NOT EXISTS seo_title_ar text,
  ADD COLUMN IF NOT EXISTS seo_desc_ar text,
  ADD COLUMN IF NOT EXISTS telemedicine_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_completeness int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'self',
  ADD COLUMN IF NOT EXISTS confidence_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS normalized_name_ar text,
  ADD COLUMN IF NOT EXISTS phone_e164 text;

CREATE UNIQUE INDEX IF NOT EXISTS hc_doctors_qr_token_uidx
  ON public.hc_doctors(qr_token) WHERE qr_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS hc_doctors_normalized_name_idx
  ON public.hc_doctors(normalized_name_ar);
CREATE INDEX IF NOT EXISTS hc_doctors_phone_idx
  ON public.hc_doctors(phone_e164);

-- ---------- EXTEND hc_verification_requests ----------
ALTER TABLE public.hc_verification_requests
  ADD COLUMN IF NOT EXISTS duplicate_of uuid REFERENCES public.hc_doctors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS photo_review_status text,
  ADD COLUMN IF NOT EXISTS reviewer_notes text,
  ADD COLUMN IF NOT EXISTS status_history jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ---------- hc_doctor_practices ----------
CREATE TABLE IF NOT EXISTS public.hc_doctor_practices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.hc_doctors(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.hc_locations(id) ON DELETE CASCADE,
  practice_type public.hc_practice_type NOT NULL DEFAULT 'clinic',
  working_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  phone text,
  whatsapp text,
  assistant_phone text,
  booking_method public.hc_booking_method NOT NULL DEFAULT 'phone',
  consultation_duration_min int,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, location_id)
);

GRANT SELECT ON public.hc_doctor_practices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hc_doctor_practices TO authenticated;
GRANT ALL ON public.hc_doctor_practices TO service_role;

ALTER TABLE public.hc_doctor_practices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practices public read verified"
  ON public.hc_doctor_practices FOR SELECT
  TO anon, authenticated
  USING (
    is_active AND EXISTS (
      SELECT 1 FROM public.hc_doctors d
      WHERE d.id = hc_doctor_practices.doctor_id
        AND d.is_public = true
        AND d.verification_status = 'verified'
    )
  );

CREATE POLICY "practices owner manage"
  ON public.hc_doctor_practices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.hc_doctors d
      WHERE d.id = hc_doctor_practices.doctor_id
        AND (d.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hc_doctors d
      WHERE d.id = hc_doctor_practices.doctor_id
        AND (d.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE INDEX IF NOT EXISTS hc_doctor_practices_doctor_idx ON public.hc_doctor_practices(doctor_id);
CREATE INDEX IF NOT EXISTS hc_doctor_practices_location_idx ON public.hc_doctor_practices(location_id);

CREATE TRIGGER trg_hc_doctor_practices_touch
  BEFORE UPDATE ON public.hc_doctor_practices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- hc_doctor_join_submissions ----------
CREATE TABLE IF NOT EXISTS public.hc_doctor_join_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name_ar text NOT NULL,
  full_name_en text,
  normalized_name_ar text NOT NULL,
  title text,
  phone text NOT NULL,
  phone_e164 text NOT NULL,
  email text,
  city text,
  governorate text,
  claimed_specialties text[] NOT NULL DEFAULT '{}',
  practice_wishlist jsonb NOT NULL DEFAULT '[]'::jsonb,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  biography text,
  duplicate_of uuid REFERENCES public.hc_doctors(id) ON DELETE SET NULL,
  duplicate_score int NOT NULL DEFAULT 0,
  status public.hc_join_status NOT NULL DEFAULT 'new',
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes text,
  decision_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hc_doctor_join_submissions TO authenticated;
GRANT INSERT ON public.hc_doctor_join_submissions TO anon;
GRANT ALL ON public.hc_doctor_join_submissions TO service_role;

ALTER TABLE public.hc_doctor_join_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "join anon insert"
  ON public.hc_doctor_join_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "join submitter read own"
  ON public.hc_doctor_join_submissions FOR SELECT
  TO authenticated
  USING (submitter_user_id = auth.uid());

CREATE POLICY "join admin all"
  ON public.hc_doctor_join_submissions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS hc_join_status_idx ON public.hc_doctor_join_submissions(status);
CREATE INDEX IF NOT EXISTS hc_join_normalized_idx ON public.hc_doctor_join_submissions(normalized_name_ar);
CREATE INDEX IF NOT EXISTS hc_join_phone_idx ON public.hc_doctor_join_submissions(phone_e164);

CREATE TRIGGER trg_hc_join_touch
  BEFORE UPDATE ON public.hc_doctor_join_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- RPCs ----------

-- Arabic normalization (simple, mirrors src/lib/normalize/arabicName.ts)
CREATE OR REPLACE FUNCTION public.hc_normalize_ar(_s text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE WHEN _s IS NULL THEN NULL ELSE
    lower(trim(regexp_replace(
      translate(
        regexp_replace(_s, '[\u064B-\u0652\u0670]', '', 'g'),
        'أإآاىيةؤئ',
        'اااايهوي'
      ),
      '\s+', ' ', 'g'
    )))
  END;
$$;

REVOKE ALL ON FUNCTION public.hc_normalize_ar(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hc_normalize_ar(text) TO anon, authenticated, service_role;

-- Profile completeness
CREATE OR REPLACE FUNCTION public.hc_recompute_profile_completeness(_doctor uuid)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.hc_doctors%ROWTYPE;
  score int := 0;
  spec_count int := 0;
  loc_count int := 0;
  pract_count int := 0;
BEGIN
  SELECT * INTO d FROM public.hc_doctors WHERE id = _doctor;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF d.full_name_ar IS NOT NULL AND length(d.full_name_ar) > 3 THEN score := score + 8; END IF;
  IF d.full_name_en IS NOT NULL THEN score := score + 4; END IF;
  IF d.title IS NOT NULL THEN score := score + 4; END IF;
  IF d.bio_ar IS NOT NULL AND length(d.bio_ar) > 40 THEN score := score + 8; END IF;
  IF d.photo_url IS NOT NULL THEN score := score + 10; END IF;
  IF d.years_experience IS NOT NULL THEN score := score + 4; END IF;
  IF array_length(d.languages, 1) IS NOT NULL THEN score := score + 3; END IF;
  IF d.academic_title IS NOT NULL OR d.medical_title IS NOT NULL THEN score := score + 5; END IF;
  IF array_length(d.sub_specialties, 1) IS NOT NULL THEN score := score + 4; END IF;
  IF jsonb_array_length(d.certificates) > 0 THEN score := score + 6; END IF;
  IF jsonb_array_length(d.services) > 0 THEN score := score + 6; END IF;
  IF d.consultation_fee_min IS NOT NULL THEN score := score + 4; END IF;
  IF jsonb_array_length(d.gallery) > 0 THEN score := score + 3; END IF;
  IF d.intro_video_url IS NOT NULL THEN score := score + 3; END IF;
  IF d.seo_title_ar IS NOT NULL THEN score := score + 2; END IF;

  SELECT COUNT(*) INTO spec_count FROM public.hc_doctor_specialties WHERE doctor_id = _doctor;
  SELECT COUNT(*) INTO loc_count FROM public.hc_doctor_locations WHERE doctor_id = _doctor;
  SELECT COUNT(*) INTO pract_count FROM public.hc_doctor_practices WHERE doctor_id = _doctor;

  IF spec_count > 0 THEN score := score + 10; END IF;
  IF loc_count > 0 THEN score := score + 8; END IF;
  IF pract_count > 0 THEN score := score + 8; END IF;

  score := LEAST(score, 100);
  UPDATE public.hc_doctors SET profile_completeness = score WHERE id = _doctor;
  RETURN score;
END $$;

REVOKE ALL ON FUNCTION public.hc_recompute_profile_completeness(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hc_recompute_profile_completeness(uuid) TO authenticated, service_role;

-- Trust score
CREATE OR REPLACE FUNCTION public.hc_recompute_trust_score(_doctor uuid)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.hc_doctors%ROWTYPE;
  s int := 0;
  q_count int := 0;
BEGIN
  SELECT * INTO d FROM public.hc_doctors WHERE id = _doctor;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF d.verification_status = 'verified' THEN s := s + 40; END IF;
  IF d.last_verified_at IS NOT NULL AND d.last_verified_at > now() - interval '365 days' THEN s := s + 10; END IF;
  IF d.source = 'hospital' THEN s := s + 15;
  ELSIF d.source = 'doctor' THEN s := s + 10;
  ELSIF d.source = 'public' THEN s := s + 5;
  END IF;

  SELECT COUNT(*) INTO q_count FROM public.hc_doctor_qualifications WHERE doctor_id = _doctor;
  s := s + LEAST(q_count * 3, 15);

  IF jsonb_array_length(d.certificates) > 0 THEN s := s + 5; END IF;
  IF d.profile_completeness >= 70 THEN s := s + 10; ELSIF d.profile_completeness >= 40 THEN s := s + 5; END IF;
  IF d.confidence_score > 0 THEN s := s + LEAST(d.confidence_score / 20, 5); END IF;

  s := LEAST(s, 100);
  UPDATE public.hc_doctors SET trust_score = s WHERE id = _doctor;
  RETURN s;
END $$;

REVOKE ALL ON FUNCTION public.hc_recompute_trust_score(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hc_recompute_trust_score(uuid) TO authenticated, service_role;

-- Duplicate detection
CREATE OR REPLACE FUNCTION public.hc_detect_doctor_duplicates(_name_ar text, _phone text)
RETURNS TABLE (doctor_id uuid, slug text, full_name_ar text, phone_e164 text, score int)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE norm text; ph text;
BEGIN
  norm := public.hc_normalize_ar(_name_ar);
  ph := regexp_replace(coalesce(_phone,''), '\D', '', 'g');

  RETURN QUERY
  SELECT d.id, d.slug, d.full_name_ar, d.phone_e164,
    (CASE WHEN d.normalized_name_ar = norm THEN 60
          WHEN d.normalized_name_ar LIKE '%' || norm || '%' THEN 35
          ELSE 0 END
     + CASE WHEN ph <> '' AND d.phone_e164 IS NOT NULL AND regexp_replace(d.phone_e164, '\D', '', 'g') = ph THEN 40 ELSE 0 END)::int AS score
  FROM public.hc_doctors d
  WHERE norm IS NOT NULL AND (
    d.normalized_name_ar = norm
    OR d.normalized_name_ar LIKE '%' || norm || '%'
    OR (ph <> '' AND d.phone_e164 IS NOT NULL AND regexp_replace(d.phone_e164, '\D', '', 'g') = ph)
  )
  ORDER BY score DESC
  LIMIT 10;
END $$;

REVOKE ALL ON FUNCTION public.hc_detect_doctor_duplicates(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hc_detect_doctor_duplicates(text, text) TO authenticated, service_role;

-- Normalize doctor row
CREATE OR REPLACE FUNCTION public.hc_normalize_doctor_row(_doctor uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.hc_doctors
  SET normalized_name_ar = public.hc_normalize_ar(full_name_ar)
  WHERE id = _doctor;
  PERFORM public.hc_recompute_profile_completeness(_doctor);
  PERFORM public.hc_recompute_trust_score(_doctor);
END $$;

REVOKE ALL ON FUNCTION public.hc_normalize_doctor_row(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hc_normalize_doctor_row(uuid) TO authenticated, service_role;

-- Approve join submission
CREATE OR REPLACE FUNCTION public.hc_approve_join_submission(_submission uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.hc_doctor_join_submissions%ROWTYPE;
  new_doctor uuid;
  base_slug text;
  final_slug text;
  suffix int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO s FROM public.hc_doctor_join_submissions WHERE id = _submission FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'submission not found'; END IF;
  IF s.status = 'approved' THEN RAISE EXCEPTION 'already approved'; END IF;

  base_slug := regexp_replace(lower(coalesce(s.full_name_en, s.normalized_name_ar, 'doctor')), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'doctor'; END IF;
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.hc_doctors WHERE slug = final_slug) LOOP
    suffix := suffix + 1;
    final_slug := base_slug || '-' || suffix::text;
  END LOOP;

  INSERT INTO public.hc_doctors (
    user_id, slug, full_name_ar, full_name_en, title, bio_ar,
    languages, verification_status, verified_at, verified_by,
    is_public, source, normalized_name_ar, phone_e164, metadata
  ) VALUES (
    s.submitter_user_id, final_slug, s.full_name_ar, s.full_name_en, s.title, s.biography,
    ARRAY['ar']::text[], 'verified', now(), auth.uid(),
    true, 'self', s.normalized_name_ar, s.phone_e164,
    jsonb_build_object('source_submission', s.id)
  ) RETURNING id INTO new_doctor;

  UPDATE public.hc_doctor_join_submissions
  SET status = 'approved', reviewer_id = auth.uid(), decision_at = now()
  WHERE id = _submission;

  PERFORM public.hc_normalize_doctor_row(new_doctor);
  RETURN new_doctor;
END $$;

REVOKE ALL ON FUNCTION public.hc_approve_join_submission(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hc_approve_join_submission(uuid) TO authenticated, service_role;

-- Triggers to auto-recompute
CREATE OR REPLACE FUNCTION public.hc_touch_doctor_scores()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.hc_recompute_profile_completeness(OLD.doctor_id);
    PERFORM public.hc_recompute_trust_score(OLD.doctor_id);
    RETURN OLD;
  ELSE
    PERFORM public.hc_recompute_profile_completeness(NEW.doctor_id);
    PERFORM public.hc_recompute_trust_score(NEW.doctor_id);
    RETURN NEW;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_hc_practices_score ON public.hc_doctor_practices;
CREATE TRIGGER trg_hc_practices_score
  AFTER INSERT OR UPDATE OR DELETE ON public.hc_doctor_practices
  FOR EACH ROW EXECUTE FUNCTION public.hc_touch_doctor_scores();

-- Backfill normalized_name_ar for existing doctors
UPDATE public.hc_doctors
SET normalized_name_ar = public.hc_normalize_ar(full_name_ar)
WHERE normalized_name_ar IS NULL AND full_name_ar IS NOT NULL;
