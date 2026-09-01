import { supabase } from './supabase';
import { UserProfile, UserRole } from '../types';
import { ENV } from '../config/env';

export interface SignUpStaffParams {
  email: string;
  password: string;
  name: string;
  staffId: string;
  department: string;
  mobile: string;
}

export interface SignUpStudentParams {
  email: string;
  password: string;
  name: string;
  rollNo: string;
  department: string;
  classSection: string;
  mobile: string;
}

export const authService = {
  // Sign Up Staff Member
  signUpStaff: async (params: SignUpStaffParams): Promise<{ profile: UserProfile | null; error: Error | null }> => {
    if (!ENV.isSupabaseConfigured()) {
      return {
        profile: {
          id: 'staff-demo-' + Date.now(),
          role: 'staff',
          name: params.name || 'Faculty Member',
          email: params.email,
          mobile: params.mobile,
          department: params.department || 'Computer Science & Engineering',
          staffId: params.staffId || 'CSE-FAC-001',
          createdAt: new Date().toISOString(),
        },
        error: null,
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
          data: {
            role: 'staff',
            name: params.name,
            staff_id: params.staffId,
            department: params.department,
            mobile: params.mobile,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('Sign up failed: no user returned.');

      // Wait a moment for trigger or fetch profile
      const profile = await authService.getUserProfile(data.user.id);
      return { profile, error: null };
    } catch (err: any) {
      return { profile: null, error: err };
    }
  },

  // Sign Up Student
  signUpStudent: async (params: SignUpStudentParams): Promise<{ profile: UserProfile | null; error: Error | null }> => {
    if (!ENV.isSupabaseConfigured()) {
      return {
        profile: {
          id: 'student-demo-' + Date.now(),
          role: 'student',
          name: params.name || 'Student Member',
          email: params.email,
          mobile: params.mobile,
          department: params.department || 'Computer Science & Engineering',
          rollNo: params.rollNo || '21CS001',
          classSection: params.classSection || 'CSE Sec A',
          createdAt: new Date().toISOString(),
        },
        error: null,
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
          data: {
            role: 'student',
            name: params.name,
            roll_no: params.rollNo,
            department: params.department,
            class_section: params.classSection,
            mobile: params.mobile,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('Sign up failed: no user returned.');

      const profile = await authService.getUserProfile(data.user.id);
      return { profile, error: null };
    } catch (err: any) {
      return { profile: null, error: err };
    }
  },

  // Sign In with Email & Password
  signIn: async (email: string, password: string): Promise<{ profile: UserProfile | null; error: Error | null }> => {
    if (!ENV.isSupabaseConfigured()) {
      // Mock sign in fallback based on email hint or default
      const isStaff = email.toLowerCase().includes('staff') || email.toLowerCase().includes('faculty') || email.toLowerCase().includes('sujith');
      const profile: UserProfile = isStaff
        ? {
            id: 'staff-001',
            role: 'staff',
            name: 'Dr. Sujith Philips',
            email: email || 'sujith.philips@college.edu',
            mobile: '+91 98765 43210',
            department: 'Computer Science & Engineering',
            staffId: 'CSE-FAC-104',
            createdAt: new Date().toISOString(),
          }
        : {
            id: 'student-001',
            role: 'student',
            name: 'Alex Johnson',
            email: email || 'alex.j@student.college.edu',
            mobile: '+91 91234 56789',
            department: 'Computer Science & Engineering',
            rollNo: '21CS1085',
            classSection: 'CSE - Section B (Semester 6)',
            createdAt: new Date().toISOString(),
          };

      return { profile, error: null };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('No user returned from login.');

      const profile = await authService.getUserProfile(data.user.id);
      return { profile, error: null };
    } catch (err: any) {
      return { profile: null, error: err };
    }
  },

  // Get User Profile from public.users table
  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        // Fallback to auth metadata if profile query fails
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          const meta = authData.user.user_metadata || {};
          return {
            id: authData.user.id,
            role: (meta.role as UserRole) || 'student',
            name: meta.name || authData.user.email?.split('@')[0] || 'User',
            email: authData.user.email || '',
            mobile: meta.mobile || '',
            department: meta.department || 'Computer Science & Engineering',
            rollNo: meta.roll_no || null,
            staffId: meta.staff_id || null,
            classSection: meta.class_section || null,
            createdAt: authData.user.created_at || new Date().toISOString(),
          };
        }
        return null;
      }

      return {
        id: data.id,
        role: data.role as UserRole,
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        department: data.department,
        rollNo: data.roll_no,
        staffId: data.staff_id,
        classSection: data.class_section,
        createdAt: data.created_at,
      };
    } catch (e) {
      return null;
    }
  },

  // Sign Out
  signOut: async (): Promise<void> => {
    if (ENV.isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
  },
};
