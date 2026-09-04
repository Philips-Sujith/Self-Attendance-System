-- ==============================================================================
-- SAS (Self Attendance System) — Supabase PostgreSQL Database Schema & RLS
-- ==============================================================================

-- 1. Create Custom Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('staff', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('active', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE verification_method AS ENUM ('wifi_local_network', 'manual_override');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('present', 'late', 'manual_override', 'absent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Users Table (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'student',
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  mobile TEXT,
  roll_no TEXT,             -- Present for students (e.g. "21CS1085")
  staff_id TEXT,            -- Present for staff (e.g. "CSE-FAC-104")
  department TEXT NOT NULL DEFAULT 'Computer Science & Engineering',
  class_section TEXT,       -- Present for students (e.g. "CSE - Section B")
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Course Groups Table
CREATE TABLE IF NOT EXISTS public.course_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  section TEXT NOT NULL,
  staff_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  join_code TEXT UNIQUE NOT NULL,
  schedule_day TEXT NOT NULL,
  schedule_period TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Group Memberships Table (Students enrolled in Course Groups)
CREATE TABLE IF NOT EXISTS public.group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.course_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_group_student UNIQUE (group_id, student_id)
);

-- 5. Attendance Sessions Table
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.course_groups(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  period TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 5,
  status session_status NOT NULL DEFAULT 'active',
  network_session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Attendance Records Table (Anti-Proxy Enforced)
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verification_method verification_method NOT NULL DEFAULT 'wifi_local_network',
  device_id TEXT NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  override_reason TEXT,
  -- Anti-Proxy Safeguards:
  -- (1) One student cannot mark attendance twice in the same session
  CONSTRAINT unique_session_student UNIQUE (session_id, student_id)
);

-- Anti-Proxy Safeguard (2): One device cannot be used for multiple student marks in the same session
-- Partial index allows instructors to perform multiple manual overrides without device collisions
CREATE UNIQUE INDEX IF NOT EXISTS unique_session_device
  ON public.attendance_records(session_id, device_id)
  WHERE verification_method != 'manual_override';

-- Indexes for high-frequency queries and realtime subscriptions
CREATE INDEX IF NOT EXISTS idx_course_groups_staff ON public.course_groups(staff_id);
CREATE INDEX IF NOT EXISTS idx_course_groups_join_code ON public.course_groups(join_code);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group ON public.group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_student ON public.group_memberships(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_group ON public.attendance_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_status ON public.attendance_sessions(status);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON public.attendance_records(student_id);

-- ==============================================================================
-- 7. Automated Trigger for New User Profile Creation
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role;
  v_name TEXT;
  v_mobile TEXT;
  v_roll_no TEXT;
  v_staff_id TEXT;
  v_department TEXT;
  v_class_section TEXT;
BEGIN
  -- Extract metadata safely from raw_user_meta_data with robust role normalization
  IF lower(COALESCE(new.raw_user_meta_data->>'role', 'student')) IN ('staff', 'admin', 'faculty') THEN
    v_role := 'staff'::public.user_role;
  ELSE
    v_role := 'student'::public.user_role;
  END IF;

  v_name := COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  v_mobile := new.raw_user_meta_data->>'mobile';
  v_roll_no := new.raw_user_meta_data->>'roll_no';
  v_staff_id := new.raw_user_meta_data->>'staff_id';
  v_department := COALESCE(new.raw_user_meta_data->>'department', 'Computer Science & Engineering');
  v_class_section := new.raw_user_meta_data->>'class_section';

  INSERT INTO public.users (
    id,
    role,
    name,
    email,
    mobile,
    roll_no,
    staff_id,
    department,
    class_section
  )
  VALUES (
    new.id,
    v_role,
    v_name,
    new.email,
    v_mobile,
    v_roll_no,
    v_staff_id,
    v_department,
    v_class_section
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    mobile = EXCLUDED.mobile,
    roll_no = EXCLUDED.roll_no,
    staff_id = EXCLUDED.staff_id,
    department = EXCLUDED.department,
    class_section = EXCLUDED.class_section;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-confirm user email upon registration (prevents SMTP rate limits & email confirmation blocks)
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_auto_confirm_user ON auth.users;
CREATE TRIGGER tr_auto_confirm_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user();

-- ==============================================================================
-- 8. Row Level Security (RLS) Policies & Helper Functions
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- SECURITY DEFINER Helper Functions (Eliminates Cross-Table RLS Recursion)
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

-- Check if a staff member owns the session and student is enrolled (for manual override)
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

GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_staff(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_of_student(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_mark_attendance(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_session_staff(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_staff_override_attendance(uuid, uuid, uuid) TO authenticated;

-- ------------------------------------------------------------------------------
-- USERS Table Policies
-- ------------------------------------------------------------------------------
-- Users can read their own profile
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()));

-- Staff can view student profiles in their groups (via helper function, NO recursion)
CREATE POLICY "Staff can view enrolled students profiles"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    public.is_staff_of_student(public.users.id, (SELECT auth.uid()))
  );

-- ------------------------------------------------------------------------------
-- COURSE_GROUPS Table Policies
-- ------------------------------------------------------------------------------
-- Staff can insert their own course groups (must be staff role and match auth.uid)
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
-- GROUP_MEMBERSHIPS Table Policies
-- ------------------------------------------------------------------------------
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

-- Staff can view memberships of their course groups (via helper, NO recursion)
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
-- ATTENDANCE_SESSIONS Table Policies
-- ------------------------------------------------------------------------------
-- Staff can insert attendance sessions for their groups
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

-- Students can view attendance sessions for their enrolled groups
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
-- ATTENDANCE_RECORDS Table Policies
-- ------------------------------------------------------------------------------
-- Students can submit attendance for active sessions they are enrolled in
CREATE POLICY "Students can mark attendance for active sessions"
  ON public.attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND public.can_mark_attendance(session_id, (SELECT auth.uid()))
  );

-- Staff can insert attendance overrides (for absent students who have no prior record)
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

-- Staff can delete attendance records (e.g. overriding back to absent)
CREATE POLICY "Staff can delete attendance records for their sessions"
  ON public.attendance_records FOR DELETE
  TO authenticated
  USING (
    public.is_staff((SELECT auth.uid()))
    AND public.can_staff_override_attendance(session_id, student_id, (SELECT auth.uid()))
  );

-- ------------------------------------------------------------------------------
-- Enable Supabase Realtime for live dashboard updates
-- ------------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
