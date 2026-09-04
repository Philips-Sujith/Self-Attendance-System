// ==============================================================================
// SAS — Production Auth Context
// Database as Single Source of Truth for Authentication & User Roles
// ==============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole } from '../types';
import { authService, SignUpStaffParams, SignUpStudentParams } from '../services/authService';
import { supabase } from '../services/supabase';

export interface AuthActionResult {
  success: boolean;
  requiresEmailConfirmation?: boolean;
  error?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isRestoringSession: boolean;
  isSubmitting: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUpStaff: (params: SignUpStaffParams) => Promise<AuthActionResult>;
  signUpStudent: (params: SignUpStudentParams) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Restore authenticated session from Supabase on app mount
  const restoreSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('Supabase session restoration error:', error.message);
        setUser(null);
        return;
      }

      if (session?.user) {
        const profile = await authService.getUserProfile(session.user.id);
        if (profile) {
          setUser(profile);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Unexpected auth initialization error:', err);
      setUser(null);
    } finally {
      setIsRestoringSession(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();

    // Subscribe to Supabase Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          const profile = await authService.getUserProfile(session.user.id);
          if (profile) {
            setUser(profile);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [restoreSession]);

  const signIn = async (
    email: string,
    password: string
  ): Promise<AuthActionResult> => {
    setIsSubmitting(true);
    try {
      const { profile, error } = await authService.signIn(email, password);
      if (error || !profile) {
        setIsSubmitting(false);
        return {
          success: false,
          error: error?.message || 'Invalid email or password. Please try again.',
        };
      }
      setUser(profile);
      setIsSubmitting(false);
      return { success: true };
    } catch (err: any) {
      setIsSubmitting(false);
      return { success: false, error: err.message || 'An unexpected error occurred during sign in.' };
    }
  };

  const signUpStaff = async (
    params: SignUpStaffParams
  ): Promise<AuthActionResult> => {
    setIsSubmitting(true);
    try {
      const { profile, requiresEmailConfirmation, error } = await authService.signUpStaff(params);
      if (error) {
        setIsSubmitting(false);
        return {
          success: false,
          error: error.message || 'Staff registration failed. Please check your information.',
        };
      }

      if (requiresEmailConfirmation) {
        setIsSubmitting(false);
        return {
          success: true,
          requiresEmailConfirmation: true,
        };
      }

      if (!profile) {
        setIsSubmitting(false);
        return {
          success: false,
          error: 'Registration succeeded but profile could not be created.',
        };
      }

      setUser(profile);
      setIsSubmitting(false);
      return { success: true };
    } catch (err: any) {
      setIsSubmitting(false);
      return { success: false, error: err.message || 'An unexpected registration error occurred.' };
    }
  };

  const signUpStudent = async (
    params: SignUpStudentParams
  ): Promise<AuthActionResult> => {
    setIsSubmitting(true);
    try {
      const { profile, requiresEmailConfirmation, error } = await authService.signUpStudent(params);
      if (error) {
        setIsSubmitting(false);
        return {
          success: false,
          error: error.message || 'Student registration failed. Please check your information.',
        };
      }

      if (requiresEmailConfirmation) {
        setIsSubmitting(false);
        return {
          success: true,
          requiresEmailConfirmation: true,
        };
      }

      if (!profile) {
        setIsSubmitting(false);
        return {
          success: false,
          error: 'Registration succeeded but profile could not be created.',
        };
      }

      setUser(profile);
      setIsSubmitting(false);
      return { success: true };
    } catch (err: any) {
      setIsSubmitting(false);
      return { success: false, error: err.message || 'An unexpected registration error occurred.' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.signOut();
    } finally {
      setUser(null);
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (user?.id) {
      const updated = await authService.getUserProfile(user.id);
      if (updated) setUser(updated);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isRestoringSession,
        isRestoringSession,
        isSubmitting,
        isAuthenticated: !!user,
        role: user?.role || null,
        signIn,
        signUpStaff,
        signUpStudent,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

