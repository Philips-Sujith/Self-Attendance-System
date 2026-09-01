import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { authService, SignUpStaffParams, SignUpStudentParams } from '../services/authService';
import { supabase } from '../services/supabase';
import { ENV } from '../config/env';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  loginAsStaff: (email?: string) => Promise<void>;
  loginAsStudent: (email?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpStaff: (params: SignUpStaffParams) => Promise<{ success: boolean; error?: string }>;
  signUpStudent: (params: SignUpStudentParams) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  setUser: (user: UserProfile | null) => void;
}

const MOCK_STAFF_USER: UserProfile = {
  id: 'staff-001',
  role: 'staff',
  name: 'Dr. Sujith Philips',
  email: 'sujith.philips@college.edu',
  mobile: '+91 98765 43210',
  department: 'Computer Science & Engineering',
  staffId: 'CSE-FAC-104',
  createdAt: new Date().toISOString(),
};

const MOCK_STUDENT_USER: UserProfile = {
  id: 'student-001',
  role: 'student',
  name: 'Alex Johnson',
  email: 'alex.j@student.college.edu',
  mobile: '+91 91234 56789',
  department: 'Computer Science & Engineering',
  rollNo: '21CS1085',
  classSection: 'CSE - Section B (Semester 6)',
  createdAt: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore Supabase Session on Mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (ENV.isSupabaseConfigured()) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const profile = await authService.getUserProfile(session.user.id);
            if (profile) {
              setUser(profile);
            }
          }
        }
      } catch (err) {
        console.warn('Auth session initialization failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen to Supabase Auth state changes if configured
    if (ENV.isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const profile = await authService.getUserProfile(session.user.id);
          setUser(profile);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const { profile, error } = await authService.signIn(email, password);
      if (error || !profile) {
        setIsLoading(false);
        return { success: false, error: error?.message || 'Login failed. Please check your credentials.' };
      }
      setUser(profile);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'An unexpected error occurred.' };
    }
  };

  const signUpStaff = async (params: SignUpStaffParams): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const { profile, error } = await authService.signUpStaff(params);
      if (error || !profile) {
        setIsLoading(false);
        return { success: false, error: error?.message || 'Staff registration failed.' };
      }
      setUser(profile);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'An unexpected error occurred.' };
    }
  };

  const signUpStudent = async (params: SignUpStudentParams): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const { profile, error } = await authService.signUpStudent(params);
      if (error || !profile) {
        setIsLoading(false);
        return { success: false, error: error?.message || 'Student registration failed.' };
      }
      setUser(profile);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'An unexpected error occurred.' };
    }
  };

  const loginAsStaff = async (email?: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setUser({
        ...MOCK_STAFF_USER,
        email: email || MOCK_STAFF_USER.email,
      });
      setIsLoading(false);
    }, 300);
  };

  const loginAsStudent = async (email?: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setUser({
        ...MOCK_STUDENT_USER,
        email: email || MOCK_STUDENT_USER.email,
      });
      setIsLoading(false);
    }, 300);
  };

  const logout = async () => {
    setIsLoading(true);
    await authService.signOut();
    setUser(null);
    setIsLoading(false);
  };

  const switchRole = (newRole: UserRole) => {
    if (newRole === 'staff') {
      setUser(MOCK_STAFF_USER);
    } else {
      setUser(MOCK_STUDENT_USER);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        role: user?.role ?? null,
        loginAsStaff,
        loginAsStudent,
        signIn,
        signUpStaff,
        signUpStudent,
        logout,
        switchRole,
        setUser,
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
