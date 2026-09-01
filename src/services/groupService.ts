// ==============================================================================
// SAS — Course Groups & Roster Service (Pure Supabase Implementation)
// Zero Mock Data — PostgreSQL Database as Single Source of Truth
// ==============================================================================

import { supabase } from './supabase';
import { CourseGroup, UserProfile } from '../types';

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
  id: string;
  studentId: string;
  name: string;
  rollNo: string;
  email: string;
  department: string;
  classSection: string;
  mobile?: string;
  joinedAt: string;
  attendancePercentage?: number;
}

export const groupService = {
  // Generate a clean, unambiguous 6-character alphanumeric join code
  generateJoinCode: (codePrefix: string): string => {
    const cleanPrefix = codePrefix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'SAS';
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude easily confused I, O, 0, 1
    let randomPart = '';
    for (let i = 0; i < 3; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${cleanPrefix}-${randomPart}`;
  },

  // Create a new Course Group in Supabase
  createCourseGroup: async (
    params: CreateCourseGroupParams
  ): Promise<{ group: CourseGroup | null; error: Error | null }> => {
    const joinCode = groupService.generateJoinCode(params.code);

    try {
      const { data, error } = await supabase
        .from('course_groups')
        .insert({
          name: params.name.trim(),
          code: params.code.trim().toUpperCase(),
          section: params.section.trim(),
          staff_id: params.staffId,
          join_code: joinCode,
          schedule_day: params.scheduleDay.trim(),
          schedule_period: params.schedulePeriod.trim(),
        })
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Database insert succeeded but returned no group data.');

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
      console.error('Supabase createCourseGroup error:', err);
      return { group: null, error: err };
    }
  },

  // Get all Course Groups created by a Staff member
  getStaffCourseGroups: async (staffId: string): Promise<CourseGroup[]> => {
    try {
      const { data, error } = await supabase
        .from('course_groups')
        .select(`
          *,
          group_memberships (count)
        `)
        .eq('staff_id', staffId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase getStaffCourseGroups error:', error);
        return [];
      }

      if (!data) return [];

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
    } catch (err) {
      console.error('Error in getStaffCourseGroups:', err);
      return [];
    }
  },

  // Get all Course Groups enrolled by a Student
  getStudentCourseGroups: async (studentId: string): Promise<CourseGroup[]> => {
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
            users:staff_id (name)
          )
        `)
        .eq('student_id', studentId);

      if (error) {
        console.error('Supabase getStudentCourseGroups error:', error);
        return [];
      }

      if (!data) return [];

      return data
        .filter((item: any) => item.course_groups)
        .map((item: any) => {
          const group = item.course_groups;
          return {
            id: group.id,
            name: group.name,
            code: group.code,
            section: group.section,
            staffId: group.staff_id,
            staffName: group.users?.name || 'Faculty Member',
            joinCode: group.join_code,
            scheduleDay: group.schedule_day,
            schedulePeriod: group.schedule_period,
            createdAt: group.created_at,
          };
        });
    } catch (err) {
      console.error('Error in getStudentCourseGroups:', err);
      return [];
    }
  },

  // Student joins course group by join-code (Case-insensitive & space/dash normalized)
  joinCourseGroupByCode: async (
    studentId: string,
    joinCode: string,
    _studentProfile?: UserProfile | null
  ): Promise<{ success: boolean; group?: CourseGroup; error?: string }> => {
    const rawCode = joinCode.trim().toUpperCase();
    if (!rawCode) {
      return { success: false, error: 'Please enter a valid course join code.' };
    }

    try {
      // 1. Search for group by join_code or stripped version
      let { data: group, error: groupErr } = await supabase
        .from('course_groups')
        .select('*')
        .ilike('join_code', rawCode)
        .maybeSingle();

      // If not found with exact/case, try searching with hyphen if user omitted it (e.g. CS38F9 -> CS3-8F9)
      if (!group && rawCode.length >= 4 && !rawCode.includes('-')) {
        const withHyphen = `${rawCode.slice(0, 3)}-${rawCode.slice(3)}`;
        const { data: retryGroup } = await supabase
          .from('course_groups')
          .select('*')
          .ilike('join_code', withHyphen)
          .maybeSingle();
        if (retryGroup) {
          group = retryGroup;
          groupErr = null;
        }
      }

      if (groupErr || !group) {
        return {
          success: false,
          error: `No active course group found with join code "${rawCode}". Please verify with your professor.`,
        };
      }

      // 2. Check if student is already enrolled
      const { data: existingMembership } = await supabase
        .from('group_memberships')
        .select('id')
        .eq('group_id', group.id)
        .eq('student_id', studentId)
        .maybeSingle();

      if (existingMembership) {
        return {
          success: false,
          error: 'You are already enrolled in this course group.',
        };
      }

      // 3. Insert real membership into public.group_memberships
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

      const joinedGroup: CourseGroup = {
        id: group.id,
        name: group.name,
        code: group.code,
        section: group.section,
        staffId: group.staff_id,
        joinCode: group.join_code,
        scheduleDay: group.schedule_day,
        schedulePeriod: group.schedule_period,
        createdAt: group.created_at,
      };

      return { success: true, group: joinedGroup };
    } catch (err: any) {
      console.error('Supabase joinCourseGroupByCode error:', err);
      return { success: false, error: err.message || 'Database error while enrolling in group.' };
    }
  },

  // Get full roster for a Course Group
  getCourseGroupRoster: async (groupId: string): Promise<RosterMember[]> => {
    try {
      const { data, error } = await supabase
        .from('group_memberships')
        .select(`
          id,
          joined_at,
          student_id,
          users:student_id (
            id,
            name,
            roll_no,
            email,
            department,
            class_section,
            mobile
          )
        `)
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (error || !data) {
        console.error('Supabase getCourseGroupRoster error:', error);
        return [];
      }

      return data
        .filter((item: any) => item.users)
        .map((item: any) => {
          const user = item.users;
          return {
            id: item.id,
            studentId: user.id,
            name: user.name || 'Student',
            rollNo: user.roll_no || 'N/A',
            email: user.email || '',
            department: user.department || 'CSE',
            classSection: user.class_section || 'Section A',
            mobile: user.mobile || undefined,
            joinedAt: new Date(item.joined_at).toISOString().split('T')[0],
          };
        });
    } catch (err) {
      console.error('Error fetching course roster:', err);
      return [];
    }
  },

  // Remove a student from a course group roster (Staff only)
  removeStudentFromRoster: async (groupId: string, studentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('group_memberships')
        .delete()
        .eq('group_id', groupId)
        .eq('student_id', studentId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Supabase removeStudentFromRoster error:', err);
      return false;
    }
  },
};
