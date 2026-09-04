-- ==============================================================================
-- SAS MIGRATION: 20260904_fix_manual_override_rls.sql
-- Fix Manual Attendance Override Database Error (RLS 42501 & Constraint 23505)
--
-- ROOT CAUSE:
-- 1. public.attendance_records had NO INSERT policy for Staff accounts. When staff
--    attempted to override an absent student, .upsert() triggered INSERT, which was
--    blocked by RLS with error 42501 (insufficient privilege / policy violation).
-- 2. The anti-proxy constraint `unique_session_device` rejected multiple manual overrides
--    within the same session because all overrides used device_id = 'STAFF_MANUAL_OVERRIDE'.
--
-- RESOLUTION:
-- 1. Create SECURITY DEFINER helper function `public.can_staff_override_attendance`.
-- 2. Add explicit Staff INSERT, UPDATE, and DELETE policies on public.attendance_records.
-- 3. Replace blanket unique constraint `unique_session_device` with a partial unique index
--    applicable only to automated student submissions (verification_method != 'manual_override').
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SECURITY DEFINER Helper Function: can_staff_override_attendance
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_staff_override_attendance(
  p_session_id uuid,
  p_student_id uuid,
  p_staff_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.attendance_sessions s
    JOIN public.group_memberships gm ON gm.group_id = s.group_id
    WHERE s.id = p_session_id
      AND s.staff_id = p_staff_id
      AND gm.student_id = p_student_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_staff_override_attendance(uuid, uuid, uuid) TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. Drop and Re-create RLS Policies on ATTENDANCE_RECORDS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can insert attendance overrides for their sessions" ON public.attendance_records;
DROP POLICY IF EXISTS "Staff can update attendance records for their sessions" ON public.attendance_records;
DROP POLICY IF EXISTS "Staff can delete attendance records for their sessions" ON public.attendance_records;

-- Staff can INSERT attendance overrides (for absent students who have no prior record)
CREATE POLICY "Staff can insert attendance overrides for their sessions"
  ON public.attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_staff((SELECT auth.uid()))
    AND public.can_staff_override_attendance(session_id, student_id, (SELECT auth.uid()))
    AND verification_method = 'manual_override'::public.verification_method
    AND override_reason IS NOT NULL
    AND length(trim(override_reason)) >= 3
  );

-- Staff can UPDATE attendance records (for students who already have a record)
CREATE POLICY "Staff can update attendance records for their sessions"
  ON public.attendance_records FOR UPDATE
  TO authenticated
  USING (
    public.is_staff((SELECT auth.uid()))
    AND public.can_staff_override_attendance(session_id, student_id, (SELECT auth.uid()))
  )
  WITH CHECK (
    public.is_staff((SELECT auth.uid()))
    AND public.can_staff_override_attendance(session_id, student_id, (SELECT auth.uid()))
    AND verification_method = 'manual_override'::public.verification_method
    AND override_reason IS NOT NULL
    AND length(trim(override_reason)) >= 3
  );

-- Staff can DELETE attendance records (e.g. overriding back to absent)
CREATE POLICY "Staff can delete attendance records for their sessions"
  ON public.attendance_records FOR DELETE
  TO authenticated
  USING (
    public.is_staff((SELECT auth.uid()))
    AND public.can_staff_override_attendance(session_id, student_id, (SELECT auth.uid()))
  );

-- ------------------------------------------------------------------------------
-- 3. Update Anti-Proxy Device Constraint for Manual Overrides
-- ------------------------------------------------------------------------------
-- Drop the blanket table constraint that was conflicting on multiple manual overrides
ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS unique_session_device;
DROP INDEX IF EXISTS public.unique_session_device;

-- Create partial unique index: enforce unique device strictly for student scans,
-- while allowing staff manual overrides without device conflict
CREATE UNIQUE INDEX IF NOT EXISTS unique_session_device
  ON public.attendance_records(session_id, device_id)
  WHERE verification_method != 'manual_override'::public.verification_method;
