-- ==============================================================================
-- SAS MIGRATION: 20260904_fix_rls_infinite_recursion.sql
-- Fix Postgres 42P17 "infinite recursion detected in policy for relation course_groups"
-- 
-- ROOT CAUSE:
-- course_groups policy ("Students can view enrolled course groups") queried group_memberships
-- while group_memberships policy ("Staff can view memberships of their groups") queried course_groups.
-- This created a direct circular dependency in PostgreSQL RLS query planner.
--
-- RESOLUTION:
-- 1. Create narrow, STABLE, SECURITY DEFINER helper functions with fixed search_path.
-- 2. Use helper functions for cross-table permission checks (bypasses RLS recursion safely).
-- 3. Replace circular EXISTS subqueries in RLS policies with direct column checks and helper functions.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SECURITY DEFINER Helper Functions
-- ------------------------------------------------------------------------------

-- Check if a user is a staff member
CREATE OR REPLACE FUNCTION public.is_staff(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id AND role = 'staff'::public.user_role
  );
$$;

-- Check if a user is the owner/faculty of a specific course group
CREATE OR REPLACE FUNCTION public.is_group_staff(p_group_id uuid, p_staff_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_groups
    WHERE id = p_group_id AND staff_id = p_staff_id
  );
$$;

-- Check if a student is enrolled in a specific course group
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid, p_student_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = p_group_id AND student_id = p_student_id
  );
$$;

-- Check if a staff member teaches an enrolled student (for student profile viewing)
CREATE OR REPLACE FUNCTION public.is_staff_of_student(p_student_id uuid, p_staff_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_groups cg
    JOIN public.group_memberships gm ON gm.group_id = cg.id
    WHERE cg.staff_id = p_staff_id AND gm.student_id = p_student_id
  );
$$;

-- Check if student is authorized to mark attendance for an active session
CREATE OR REPLACE FUNCTION public.can_mark_attendance(p_session_id uuid, p_student_id uuid DEFAULT auth.uid())
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
      AND gm.student_id = p_student_id
  );
$$;

-- Check if a staff member owns the session
CREATE OR REPLACE FUNCTION public.is_session_staff(p_session_id uuid, p_staff_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.attendance_sessions s
    WHERE s.id = p_session_id AND s.staff_id = p_staff_id
  );
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_staff(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_of_student(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_mark_attendance(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_session_staff(uuid, uuid) TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. Drop Old / Recursive Policies on COURSE_GROUPS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can manage their course groups" ON public.course_groups;
DROP POLICY IF EXISTS "Students can view enrolled course groups" ON public.course_groups;
DROP POLICY IF EXISTS "Anyone can lookup course groups by join code" ON public.course_groups;
DROP POLICY IF EXISTS "Staff can view own course groups" ON public.course_groups;
DROP POLICY IF EXISTS "Students can lookup course groups by join code" ON public.course_groups;
DROP POLICY IF EXISTS "Staff can insert course groups" ON public.course_groups;
DROP POLICY IF EXISTS "Staff can update their course groups" ON public.course_groups;
DROP POLICY IF EXISTS "Staff can delete their course groups" ON public.course_groups;

-- ------------------------------------------------------------------------------
-- 3. Create Hardened, Non-Recursive Policies on COURSE_GROUPS
-- ------------------------------------------------------------------------------

-- Staff can insert their own course groups (must be staff role and own the record)
CREATE POLICY "Staff can insert course groups"
  ON public.course_groups FOR INSERT
  TO authenticated
  WITH CHECK (
    staff_id = (SELECT auth.uid())
    AND public.is_staff((SELECT auth.uid()))
  );

-- Staff can view only course groups they own
CREATE POLICY "Staff can view own course groups"
  ON public.course_groups FOR SELECT
  TO authenticated
  USING (
    staff_id = (SELECT auth.uid())
  );

-- Students can view course groups they are enrolled in
CREATE POLICY "Students can view enrolled course groups"
  ON public.course_groups FOR SELECT
  TO authenticated
  USING (
    public.is_group_member(id, (SELECT auth.uid()))
  );

-- Students can lookup course groups by join code to enroll
CREATE POLICY "Students can lookup course groups by join code"
  ON public.course_groups FOR SELECT
  TO authenticated
  USING (
    NOT public.is_staff((SELECT auth.uid()))
  );

-- Staff can update only their own course groups
CREATE POLICY "Staff can update their course groups"
  ON public.course_groups FOR UPDATE
  TO authenticated
  USING (
    staff_id = (SELECT auth.uid())
    AND public.is_staff((SELECT auth.uid()))
  )
  WITH CHECK (
    staff_id = (SELECT auth.uid())
    AND public.is_staff((SELECT auth.uid()))
  );

-- Staff can delete only their own course groups
CREATE POLICY "Staff can delete their course groups"
  ON public.course_groups FOR DELETE
  TO authenticated
  USING (
    staff_id = (SELECT auth.uid())
    AND public.is_staff((SELECT auth.uid()))
  );

-- ------------------------------------------------------------------------------
-- 4. Drop and Re-create Policies on GROUP_MEMBERSHIPS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Students can join course groups" ON public.group_memberships;
DROP POLICY IF EXISTS "Students can view their own memberships" ON public.group_memberships;
DROP POLICY IF EXISTS "Staff can view memberships of their groups" ON public.group_memberships;
DROP POLICY IF EXISTS "Staff can remove students from their groups" ON public.group_memberships;
DROP POLICY IF EXISTS "Students can leave their groups" ON public.group_memberships;

-- Students can join course groups
CREATE POLICY "Students can join course groups"
  ON public.group_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND NOT public.is_staff((SELECT auth.uid()))
  );

-- Students can view their own memberships
CREATE POLICY "Students can view their own memberships"
  ON public.group_memberships FOR SELECT
  TO authenticated
  USING (
    student_id = (SELECT auth.uid())
  );

-- Staff can view memberships of their course groups (via SECURITY DEFINER helper, NO recursion)
CREATE POLICY "Staff can view memberships of their groups"
  ON public.group_memberships FOR SELECT
  TO authenticated
  USING (
    public.is_group_staff(group_id, (SELECT auth.uid()))
  );

-- Staff can remove students from their course groups
CREATE POLICY "Staff can remove students from their groups"
  ON public.group_memberships FOR DELETE
  TO authenticated
  USING (
    public.is_group_staff(group_id, (SELECT auth.uid()))
  );

-- Students can leave their course groups
CREATE POLICY "Students can leave their groups"
  ON public.group_memberships FOR DELETE
  TO authenticated
  USING (
    student_id = (SELECT auth.uid())
  );

-- ------------------------------------------------------------------------------
-- 5. Drop and Re-create Policies on ATTENDANCE_SESSIONS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can manage attendance sessions" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Students can view sessions for enrolled groups" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Staff can insert attendance sessions" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Staff can update their attendance sessions" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Staff can delete their attendance sessions" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Staff can view their attendance sessions" ON public.attendance_sessions;

-- Staff can insert attendance sessions for groups they own
CREATE POLICY "Staff can insert attendance sessions"
  ON public.attendance_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    staff_id = (SELECT auth.uid())
    AND public.is_staff((SELECT auth.uid()))
    AND public.is_group_staff(group_id, (SELECT auth.uid()))
  );

-- Staff can view their attendance sessions
CREATE POLICY "Staff can view their attendance sessions"
  ON public.attendance_sessions FOR SELECT
  TO authenticated
  USING (
    staff_id = (SELECT auth.uid())
  );

-- Students can view attendance sessions for groups they are enrolled in
CREATE POLICY "Students can view sessions for enrolled groups"
  ON public.attendance_sessions FOR SELECT
  TO authenticated
  USING (
    public.is_group_member(group_id, (SELECT auth.uid()))
  );

-- Staff can update their attendance sessions (e.g. close session)
CREATE POLICY "Staff can update their attendance sessions"
  ON public.attendance_sessions FOR UPDATE
  TO authenticated
  USING (
    staff_id = (SELECT auth.uid())
  )
  WITH CHECK (
    staff_id = (SELECT auth.uid())
  );

-- Staff can delete their attendance sessions
CREATE POLICY "Staff can delete their attendance sessions"
  ON public.attendance_sessions FOR DELETE
  TO authenticated
  USING (
    staff_id = (SELECT auth.uid())
  );

-- ------------------------------------------------------------------------------
-- 6. Drop and Re-create Policies on ATTENDANCE_RECORDS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Students can mark attendance for active sessions" ON public.attendance_records;
DROP POLICY IF EXISTS "Students can view their own attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Staff can view attendance records for their sessions" ON public.attendance_records;
DROP POLICY IF EXISTS "Staff can update attendance records for their sessions" ON public.attendance_records;
DROP POLICY IF EXISTS "Staff can delete attendance records for their sessions" ON public.attendance_records;

-- Students can submit attendance for active sessions they are enrolled in
CREATE POLICY "Students can mark attendance for active sessions"
  ON public.attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND public.can_mark_attendance(session_id, (SELECT auth.uid()))
  );

-- Students can read their own attendance records
CREATE POLICY "Students can view their own attendance records"
  ON public.attendance_records FOR SELECT
  TO authenticated
  USING (
    student_id = (SELECT auth.uid())
  );

-- Staff can view all attendance records for their sessions
CREATE POLICY "Staff can view attendance records for their sessions"
  ON public.attendance_records FOR SELECT
  TO authenticated
  USING (
    public.is_session_staff(session_id, (SELECT auth.uid()))
  );

-- Staff can update attendance records (manual status override with audit reason)
CREATE POLICY "Staff can update attendance records for their sessions"
  ON public.attendance_records FOR UPDATE
  TO authenticated
  USING (
    public.is_session_staff(session_id, (SELECT auth.uid()))
  )
  WITH CHECK (
    public.is_session_staff(session_id, (SELECT auth.uid()))
  );

-- Staff can delete attendance records (e.g. override back to absent)
CREATE POLICY "Staff can delete attendance records for their sessions"
  ON public.attendance_records FOR DELETE
  TO authenticated
  USING (
    public.is_session_staff(session_id, (SELECT auth.uid()))
  );

-- ------------------------------------------------------------------------------
-- 7. Drop and Re-create Policies on USERS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view enrolled students profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Users can read their own profile
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
  );

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (
    id = (SELECT auth.uid())
  );

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT auth.uid())
  );

-- Staff can view student profiles in their groups (via SECURITY DEFINER helper, NO recursion)
CREATE POLICY "Staff can view enrolled students profiles"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    public.is_staff_of_student(public.users.id, (SELECT auth.uid()))
  );
