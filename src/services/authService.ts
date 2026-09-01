import { supabase } from './supabase';
import { UserProfile, UserRole } from '../types';

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
  // Sign Up Staff Member (Real Supabase Auth + Profile)
  signUpStaff: async (params: SignUpStaffParams): Promise<{ profile: UserProfile | null; error: Error | null }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: params.email.trim().toLowerCase(),
        password: params.password,
        options: {
          data: {
            role: 'staff',
            name: params.name.trim(),
            staff_id: params.staffId.trim(),
            department: params.department.trim(),
            mobile: params.mobile.trim(),
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('Sign up failed: no user returned.');

      // Fetch created profile from public.users or ensure it exists
      const profile = await authService.getUserProfile(data.user.id, {
        role: 'staff',
        name: params.name.trim(),
        email: params.email.trim().toLowerCase(),
        mobile: params.mobile.trim(),
        department: params.department.trim(),
        staffId: params.staffId.trim(),
      });

      return { profile, error: null };
    } catch (err: any) {
      return { profile: null, error: err };
    }
  },

  // Sign Up Student (Real Supabase Auth + Profile)
  signUpStudent: async (params: SignUpStudentParams): Promise<{ profile: UserProfile | null; error: Error | null }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: params.email.trim().toLowerCase(),
        password: params.password,
        options: {
          data: {
            role: 'student',
            name: params.name.trim(),
            roll_no: params.rollNo.trim(),
            department: params.department.trim(),
            class_section: params.classSection.trim(),
            mobile: params.mobile.trim(),
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('Sign up failed: no user returned.');

      // Fetch created profile from public.users or ensure it exists
      const profile = await authService.getUserProfile(data.user.id, {
        role: 'student',
        name: params.name.trim(),
        email: params.email.trim().toLowerCase(),
        mobile: params.mobile.trim(),
        department: params.department.trim(),
        rollNo: params.rollNo.trim(),
        classSection: params.classSection.trim(),
      });

      return { profile, error: null };
    } catch (err: any) {
      return { profile: null, error: err };
    }
  },

  // Sign In with Email & Password (Real Supabase Auth)
  signIn: async (email: string, password: string): Promise<{ profile: UserProfile | null; error: Error | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Login failed: no user returned from credentials.');

      const profile = await authService.getUserProfile(data.user.id);
      if (!profile) {
        throw new Error('User profile could not be loaded. Please contact administration.');
      }

      return { profile, error: null };
    } catch (err: any) {
      return { profile: null, error: err };
    }
  },

  // Get User Profile from public.users table (Single Source of Truth)
  getUserProfile: async (
    userId: string,
    fallbackMetadata?: Partial<UserProfile>
  ): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data && !error) {
        return {
          id: data.id,
          role: data.role as UserRole,
          name: data.name,
          email: data.email,
          mobile: data.mobile || undefined,
          rollNo: data.roll_no || undefined,
          staffId: data.staff_id || undefined,
          department: data.department || 'Computer Science & Engineering',
          classSection: data.class_section || undefined,
          createdAt: data.created_at,
        };
      }

      // If public.users trigger hasn't completed yet, read user from auth and ensure profile exists
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user && authData.user.id === userId) {
        const meta = authData.user.user_metadata || {};
        const resolvedRole: UserRole = (meta.role as UserRole) || (fallbackMetadata?.role as UserRole) || 'student';
        const resolvedName: string = meta.name || fallbackMetadata?.name || authData.user.email?.split('@')[0] || 'User';
        const resolvedEmail: string = authData.user.email || fallbackMetadata?.email || '';

        // Upsert the missing profile into public.users
        const newProfile: UserProfile = {
          id: userId,
          role: resolvedRole,
          name: resolvedName,
          email: resolvedEmail,
          mobile: meta.mobile || fallbackMetadata?.mobile || undefined,
          rollNo: meta.roll_no || fallbackMetadata?.rollNo || undefined,
          staffId: meta.staff_id || fallbackMetadata?.staffId || undefined,
          department: meta.department || fallbackMetadata?.department || 'Computer Science & Engineering',
          classSection: meta.class_section || fallbackMetadata?.classSection || undefined,
          createdAt: new Date().toISOString(),
        };

        await supabase.from('users').upsert({
          id: newProfile.id,
          role: newProfile.role,
          name: newProfile.name,
          email: newProfile.email,
          mobile: newProfile.mobile || null,
          roll_no: newProfile.rollNo || null,
          staff_id: newProfile.staffId || null,
          department: newProfile.department,
          class_section: newProfile.classSection || null,
        });

        return newProfile;
      }

      return null;
    } catch (err) {
      console.error('Error fetching user profile from Supabase:', err);
      return null;
    }
  },

  // Sign Out cleanly
  signOut: async (): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  },
};
