-- ==============================================================================
-- SAS MIGRATION: 20260905_harden_attendance_rls.sql
-- Harden Attendance Security & Server-Side Session Gating
--
-- REQUIREMENTS:
-- 1. Server-side rejection of student attendance submissions if:
--    - Session status is not 'active'
--    - Current timestamp is past session end_time (expired session)
--    - Student is not enrolled in the session's course group
-- 2. Anti-proxy enforcement via unique constraints on (session_id, student_id)
--    and (session_id, device_id) for automated proximity submissions.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Hardened SECURITY DEFINER Helper: can_mark_attendance
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_mark_attendance(
  p_session_id uuid,
  p_student_id uuid DEFAULT auth.uid()
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
      AND s.status = 'active'
      AND s.end_time >= now()
      AND gm.student_id = p_student_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_mark_attendance(uuid, uuid) TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. Ensure RLS Policy on ATTENDANCE_RECORDS for Students is Bound to Helper
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Students can mark attendance for active sessions" ON public.attendance_records;

CREATE POLICY "Students can mark attendance for active sessions"
  ON public.attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND public.can_mark_attendance(session_id, (SELECT auth.uid()))
  );
