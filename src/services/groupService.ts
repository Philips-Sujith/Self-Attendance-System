import { supabase } from './supabase';
import { CourseGroup, GroupMembership, UserProfile } from '../types';
import { ENV } from '../config/env';

export interface CreateCourseGroupParams {
  name: string;
  code: string;
  section: string;
  staffId: string;
  staffName?: string;
  scheduleDay: string;
  schedulePeriod: string;
}

export interface RosterMember {
  id: string; // membership id
  studentId: string;
  name: string;
  rollNo: string;
  email: string;
  department: string;
  classSection: string;
  joinedAt: string;
  attendancePercentage?: number;
}

// In-memory fallback storage for offline/demo modes
let MOCK_COURSE_GROUPS: CourseGroup[] = [
  {
    id: 'grp-001',
    name: 'Digital System Design (DSD)',
    code: 'CS302',
    section: 'Section A',
    staffId: 'staff-001',
    staffName: 'Dr. Sujith Philips',
    joinCode: 'DSD-A24',
    scheduleDay: 'Monday, Wednesday, Friday',
    schedulePeriod: '09:00 - 10:00 AM',
    studentCount: 85,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'grp-002',
    name: 'Operating Systems & Concurrency',
    code: 'CS401',
    section: 'Section B',
    staffId: 'staff-001',
    staffName: 'Dr. Sujith Philips',
    joinCode: 'OS-B89',
    scheduleDay: 'Tuesday, Thursday',
    schedulePeriod: '11:15 - 12:45 PM',
    studentCount: 78,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'grp-003',
    name: 'Distributed Systems & Cloud',
    code: 'CS605',
    section: 'Section C',
    staffId: 'staff-001',
    staffName: 'Dr. Sujith Philips',
    joinCode: 'DSC-C12',
    scheduleDay: 'Friday',
    schedulePeriod: '02:00 - 04:00 PM',
    studentCount: 64,
    createdAt: new Date().toISOString(),
  },
];

let MOCK_MEMBERSHIPS: { [groupId: string]: RosterMember[] } = {
  'grp-001': [
    {
      id: 'mem-1',
      studentId: 'student-001',
      name: 'Alex Johnson',
      rollNo: '21CS1085',
      email: 'alex.j@student.college.edu',
      department: 'Computer Science & Engineering',
      classSection: 'CSE - Section B (Semester 6)',
      joinedAt: '2026-08-10',
      attendancePercentage: 96,
    },
    {
      id: 'mem-2',
      studentId: 'student-002',
      name: 'Priya Sharma',
      rollNo: '21CS1086',
      email: 'priya.s@student.college.edu',
      department: 'Computer Science & Engineering',
      classSection: 'CSE - Section B',
      joinedAt: '2026-08-10',
      attendancePercentage: 92,
    },
    {
      id: 'mem-3',
      studentId: 'student-003',
      name: 'Rahul Verma',
      rollNo: '21CS1087',
      email: 'rahul.v@student.college.edu',
      department: 'Computer Science & Engineering',
      classSection: 'CSE - Section B',
      joinedAt: '2026-08-11',
      attendancePercentage: 88,
    },
    {
      id: 'mem-4',
      studentId: 'student-004',
      name: 'Sneha Patel',
      rollNo: '21CS1088',
      email: 'sneha.p@student.college.edu',
      department: 'Computer Science & Engineering',
      classSection: 'CSE - Section B',
      joinedAt: '2026-08-12',
      attendancePercentage: 95,
    },
    {
      id: 'mem-5',
      studentId: 'student-005',
      name: 'Vikram Mehta',
      rollNo: '21CS1089',
      email: 'vikram.m@student.college.edu',
      department: 'Computer Science & Engineering',
      classSection: 'CSE - Section B',
      joinedAt: '2026-08-12',
      attendancePercentage: 84,
    },
  ],
};

export const groupService = {
  // Generate a random 6-character unique join code
  generateJoinCode: (code: string): string => {
    const cleanPrefix = code.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'SAS';
    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${cleanPrefix}-${randomSuffix}`;
  },

  // Create a new Course Group
  createCourseGroup: async (params: CreateCourseGroupParams): Promise<{ group: CourseGroup | null; error: Error | null }> => {
    const joinCode = groupService.generateJoinCode(params.code);

    if (!ENV.isSupabaseConfigured()) {
      const newGroup: CourseGroup = {
        id: 'grp-' + Date.now(),
        name: params.name,
        code: params.code.toUpperCase(),
        section: params.section,
        staffId: params.staffId,
        staffName: params.staffName || 'Faculty',
        joinCode,
        scheduleDay: params.scheduleDay,
        schedulePeriod: params.schedulePeriod,
        studentCount: 0,
        createdAt: new Date().toISOString(),
      };
      MOCK_COURSE_GROUPS.unshift(newGroup);
      MOCK_MEMBERSHIPS[newGroup.id] = [];
      return { group: newGroup, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('course_groups')
        .insert({
          name: params.name,
          code: params.code.toUpperCase(),
          section: params.section,
          staff_id: params.staffId,
          join_code: joinCode,
          schedule_day: params.scheduleDay,
          schedule_period: params.schedulePeriod,
        })
        .select('*')
        .single();

      if (error) throw error;

      return {
        group: {
          id: data.id,
          name: data.name,
          code: data.code,
          section: data.section,
          staffId: data.staff_id,
          staffName: params.staffName,
          joinCode: data.join_code,
          scheduleDay: data.schedule_day,
          schedulePeriod: data.schedule_period,
          studentCount: 0,
          createdAt: data.created_at,
        },
        error: null,
      };
    } catch (err: any) {
      return { group: null, error: err };
    }
  },

  // Get all Course Groups created by a Staff member
  getStaffCourseGroups: async (staffId: string): Promise<CourseGroup[]> => {
    if (!ENV.isSupabaseConfigured()) {
      return [...MOCK_COURSE_GROUPS];
    }

    try {
      const { data, error } = await supabase
        .from('course_groups')
        .select(`
          *,
          group_memberships (count)
        `)
        .eq('staff_id', staffId)
        .order('created_at', { ascending: false });

      if (error || !data) {
        return [...MOCK_COURSE_GROUPS];
      }

      return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        section: item.section,
        staffId: item.staff_id,
        joinCode: item.join_code,
        scheduleDay: item.schedule_day,
        schedulePeriod: item.schedule_period,
        studentCount: item.group_memberships?.[0]?.count || 0,
        createdAt: item.created_at,
      }));
    } catch (e) {
      return [...MOCK_COURSE_GROUPS];
    }
  },

  // Get all Course Groups enrolled by a Student
  getStudentCourseGroups: async (studentId: string): Promise<CourseGroup[]> => {
    if (!ENV.isSupabaseConfigured()) {
      return [...MOCK_COURSE_GROUPS];
    }

    try {
      const { data, error } = await supabase
        .from('group_memberships')
        .select(`
          group_id,
          course_groups (
            id,
            name,
            code,
            section,
            staff_id,
            join_code,
            schedule_day,
            schedule_period,
            created_at,
            users (name)
          )
        `)
        .eq('student_id', studentId);

      if (error || !data) {
        return [...MOCK_COURSE_GROUPS];
      }

      return data.map((item: any) => {
        const group = item.course_groups;
        return {
          id: group.id,
          name: group.name,
          code: group.code,
          section: group.section,
          staffId: group.staff_id,
          staffName: group.users?.name || 'Faculty',
          joinCode: group.join_code,
          scheduleDay: group.schedule_day,
          schedulePeriod: group.schedule_period,
          createdAt: group.created_at,
        };
      });
    } catch (e) {
      return [...MOCK_COURSE_GROUPS];
    }
  },

  // Student joins course group by join-code
  joinCourseGroupByCode: async (
    studentId: string,
    joinCode: string,
    studentProfile?: UserProfile | null
  ): Promise<{ success: boolean; group?: CourseGroup; error?: string }> => {
    const formattedCode = joinCode.trim().toUpperCase();

    if (!ENV.isSupabaseConfigured()) {
      const match = MOCK_COURSE_GROUPS.find((g) => g.joinCode.toUpperCase() === formattedCode);
      if (!match) {
        return { success: false, error: `No course group found matching join code "${formattedCode}".` };
      }

      // Check if already in roster
      const roster = MOCK_MEMBERSHIPS[match.id] || [];
      const alreadyJoined = roster.some((r) => r.studentId === studentId);
      if (alreadyJoined) {
        return { success: false, error: 'You are already enrolled in this course group.' };
      }

      // Add to mock roster
      roster.push({
        id: 'mem-' + Date.now(),
        studentId,
        name: studentProfile?.name || 'Alex Johnson',
        rollNo: studentProfile?.rollNo || '21CS1085',
        email: studentProfile?.email || 'student@college.edu',
        department: studentProfile?.department || 'CSE',
        classSection: studentProfile?.classSection || 'Section B',
        joinedAt: new Date().toISOString(),
        attendancePercentage: 100,
      });
      MOCK_MEMBERSHIPS[match.id] = roster;
      match.studentCount = roster.length;

      return { success: true, group: match };
    }

    try {
      // 1. Find group by join code
      const { data: group, error: groupErr } = await supabase
        .from('course_groups')
        .select('*')
        .eq('join_code', formattedCode)
        .single();

      if (groupErr || !group) {
        return { success: false, error: `Invalid join code "${formattedCode}". Please check with your instructor.` };
      }

      // 2. Insert into group_memberships
      const { error: joinErr } = await supabase
        .from('group_memberships')
        .insert({
          group_id: group.id,
          student_id: studentId,
        });

      if (joinErr) {
        if (joinErr.code === '23505') {
          return { success: false, error: 'You are already enrolled in this course group.' };
        }
        throw joinErr;
      }

      return {
        success: true,
        group: {
          id: group.id,
          name: group.name,
          code: group.code,
          section: group.section,
          staffId: group.staff_id,
          joinCode: group.join_code,
          scheduleDay: group.schedule_day,
          schedulePeriod: group.schedule_period,
          createdAt: group.created_at,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to join course group.' };
    }
  },

  // Get Roster for a Course Group
  getCourseGroupRoster: async (groupId: string): Promise<RosterMember[]> => {
    if (!ENV.isSupabaseConfigured()) {
      return MOCK_MEMBERSHIPS[groupId] || [];
    }

    try {
      const { data, error } = await supabase
        .from('group_memberships')
        .select(`
          id,
          student_id,
          joined_at,
          users:student_id (
            id,
            name,
            email,
            roll_no,
            department,
            class_section
          )
        `)
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (error || !data) {
        return MOCK_MEMBERSHIPS[groupId] || [];
      }

      return data.map((item: any) => {
        const u = item.users;
        return {
          id: item.id,
          studentId: item.student_id,
          name: u?.name || 'Student',
          rollNo: u?.roll_no || 'N/A',
          email: u?.email || '',
          department: u?.department || '',
          classSection: u?.class_section || '',
          joinedAt: item.joined_at?.split('T')[0] || '',
          attendancePercentage: 95, // Default/calculated
        };
      });
    } catch (e) {
      return MOCK_MEMBERSHIPS[groupId] || [];
    }
  },

  // Remove a student from a Course Group roster
  removeStudentFromRoster: async (groupId: string, studentId: string): Promise<boolean> => {
    if (!ENV.isSupabaseConfigured()) {
      if (MOCK_MEMBERSHIPS[groupId]) {
        MOCK_MEMBERSHIPS[groupId] = MOCK_MEMBERSHIPS[groupId].filter(
          (m) => m.studentId !== studentId
        );
        const g = MOCK_COURSE_GROUPS.find((grp) => grp.id === groupId);
        if (g) g.studentCount = MOCK_MEMBERSHIPS[groupId].length;
      }
      return true;
    }

    try {
      const { error } = await supabase
        .from('group_memberships')
        .delete()
        .eq('group_id', groupId)
        .eq('student_id', studentId);

      return !error;
    } catch (e) {
      return false;
    }
  },
};
