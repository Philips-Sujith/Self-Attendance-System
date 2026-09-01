// ==============================================================================
// SAS — Production Auth Context
// Database as Single Source of Truth for Authentication & User Roles
// ==============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole } from '../types';
import { authService, SignUpStaffParams, SignUpStudentParams } from '../services/authService';
import { supabase } from '../services/supabase';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpStaff: (params: SignUpStaffParams) => Promise<{ success: boolean; error?: string }>;
  signUpStudent: (params: SignUpStudentParams) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();

    // Subscribe to Supabase Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          const profile = await authService.getUserProfile(session.user.id);
          setUser(profile);
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
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const { profile, error } = await authService.signIn(email, password);
      if (error || !profile) {
        setIsLoading(false);
        return {
          success: false,
          error: error?.message || 'Invalid email or password. Please try again.',
        };
      }
      setUser(profile);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'An unexpected error occurred during sign in.' };
    }
  };

  const signUpStaff = async (
    params: SignUpStaffParams
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const { profile, error } = await authService.signUpStaff(params);
      if (error || !profile) {
        setIsLoading(false);
        return {
          success: false,
          error: error?.message || 'Staff registration failed. Please check your information.',
        };
      }
      setUser(profile);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'An unexpected registration error occurred.' };
    }
  };

  const signUpStudent = async (
    params: SignUpStudentParams
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const { profile, error } = await authService.signUpStudent(params);
      if (error || !profile) {
        setIsLoading(false);
        return {
          success: false,
          error: error?.message || 'Student registration failed. Please check your information.',
        };
      }
      setUser(profile);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'An unexpected registration error occurred.' };
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.signOut();
    } finally {
      setUser(null);
      setIsLoading(false);
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
        isLoading,
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
