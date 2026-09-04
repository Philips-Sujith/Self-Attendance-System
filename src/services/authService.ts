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

export interface SignUpResult {
  profile: UserProfile | null;
  requiresEmailConfirmation?: boolean;
  error: Error | null;
}

// Module-level in-flight lock to guarantee exactly one active auth request at a time
let isAuthActionInFlight = false;

// Format Supabase Auth API errors with actionable user-friendly messages
export const formatAuthError = (err: any): Error => {
  if (!err) return new Error('An unknown authentication error occurred.');

  const status = err.status || err.statusCode;
  const code = err.code || '';
  const message = (err.message || '').toLowerCase();

  if (status === 429 || code === 'over_email_send_rate_limit' || message.includes('rate limit')) {
    return new Error(
      'Email rate limit exceeded by Supabase built-in email provider (maximum 3-4 emails/hour on free tier). Please wait before trying again, or disable "Confirm email" in Supabase Auth settings for testing.'
    );
  }

  if (code === 'user_already_exists' || message.includes('user already registered') || message.includes('already exists')) {
    return new Error('An account with this email address already exists. Please sign in instead.');
  }

  if (code === 'weak_password' || message.includes('weak password')) {
    return new Error('Password should be at least 6 characters.');
  }

  if (status === 400 && (message.includes('invalid login credentials') || message.includes('invalid_credentials'))) {
    return new Error('Invalid email or password. Please check your credentials and try again.');
  }

  if (message.includes('email not confirmed')) {
    return new Error('Email address has not been confirmed yet. Please verify via email link or in Supabase Auth.');
  }

  return err instanceof Error ? err : new Error(err.message || String(err));
};

export const authService = {
  // Sign Up Staff Member (Real Supabase Auth + Profile)
  signUpStaff: async (params: SignUpStaffParams): Promise<SignUpResult> => {
    if (isAuthActionInFlight) {
      return {
        profile: null,
        error: new Error('A registration request is already processing. Please wait.'),
      };
    }
    isAuthActionInFlight = true;
    try {
      const email = params.email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email,
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

      if (error) throw formatAuthError(error);
      if (!data.user) throw new Error('Sign up failed: no user returned.');

      // Check if session was returned directly (when confirm email is disabled)
      if (data.session) {
        const profile = await authService.getUserProfile(data.user.id, {
          role: 'staff',
          name: params.name.trim(),
          email,
          mobile: params.mobile.trim(),
          department: params.department.trim(),
          staffId: params.staffId.trim(),
        });
        return { profile, error: null };
      }

      // If no session returned, attempt immediate sign-in (in case auto-confirm is active)
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: params.password,
      });

      if (signInData?.user && !signInErr) {
        const profile = await authService.getUserProfile(signInData.user.id, {
          role: 'staff',
          name: params.name.trim(),
          email,
          mobile: params.mobile.trim(),
          department: params.department.trim(),
          staffId: params.staffId.trim(),
        });
        return { profile, error: null };
      }

      // If email confirmation is required by Supabase
      return {
        profile: null,
        requiresEmailConfirmation: true,
        error: null,
      };
    } catch (err: any) {
      return { profile: null, error: formatAuthError(err) };
    } finally {
      isAuthActionInFlight = false;
    }
  },

  // Sign Up Student (Real Supabase Auth + Profile)
  signUpStudent: async (params: SignUpStudentParams): Promise<SignUpResult> => {
    if (isAuthActionInFlight) {
      return {
        profile: null,
        error: new Error('A registration request is already processing. Please wait.'),
      };
    }
    isAuthActionInFlight = true;
    try {
      const email = params.email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email,
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

      if (error) throw formatAuthError(error);
      if (!data.user) throw new Error('Sign up failed: no user returned.');

      // Check if session was returned directly (when confirm email is disabled)
      if (data.session) {
        const profile = await authService.getUserProfile(data.user.id, {
          role: 'student',
          name: params.name.trim(),
          email,
          mobile: params.mobile.trim(),
          department: params.department.trim(),
          rollNo: params.rollNo.trim(),
          classSection: params.classSection.trim(),
        });
        return { profile, error: null };
      }

      // If no session returned, attempt immediate sign-in
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: params.password,
      });

      if (signInData?.user && !signInErr) {
        const profile = await authService.getUserProfile(signInData.user.id, {
          role: 'student',
          name: params.name.trim(),
          email,
          mobile: params.mobile.trim(),
          department: params.department.trim(),
          rollNo: params.rollNo.trim(),
          classSection: params.classSection.trim(),
        });
        return { profile, error: null };
      }

      // If email confirmation is required by Supabase
      return {
        profile: null,
        requiresEmailConfirmation: true,
        error: null,
      };
    } catch (err: any) {
      return { profile: null, error: formatAuthError(err) };
    } finally {
      isAuthActionInFlight = false;
    }
  },

  // Sign In with Email & Password (Real Supabase Auth)
  signIn: async (email: string, password: string): Promise<{ profile: UserProfile | null; error: Error | null }> => {
    if (isAuthActionInFlight) {
      return {
        profile: null,
        error: new Error('An authentication request is already processing. Please wait.'),
      };
    }
    isAuthActionInFlight = true;
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) throw formatAuthError(error);
      if (!data.user) throw new Error('Login failed: no user returned from credentials.');

      const profile = await authService.getUserProfile(data.user.id);
      if (!profile) {
        throw new Error('User profile could not be loaded from database.');
      }

      return { profile, error: null };
    } catch (err: any) {
      return { profile: null, error: formatAuthError(err) };
    } finally {
      isAuthActionInFlight = false;
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
        const rawRole = (data.role || '').toLowerCase();
        const canonicalRole: UserRole = rawRole === 'staff' || rawRole === 'admin' ? 'staff' : 'student';

        return {
          id: data.id,
          role: canonicalRole,
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
        const rawMetaRole = (meta.role || fallbackMetadata?.role || 'student').toLowerCase();
        const resolvedRole: UserRole = rawMetaRole === 'staff' || rawMetaRole === 'admin' ? 'staff' : 'student';
        const resolvedName: string = meta.name || fallbackMetadata?.name || authData.user.email?.split('@')[0] || 'User';
        const resolvedEmail: string = authData.user.email || fallbackMetadata?.email || '';

        // Upsert the profile into public.users
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

        try {
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
        } catch (upsertErr) {
          console.warn('Upsert fallback profile warning:', upsertErr);
        }

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
