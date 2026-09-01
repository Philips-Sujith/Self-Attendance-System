import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  loginAsStaff: (email?: string) => Promise<void>;
  loginAsStudent: (email?: string) => Promise<void>;
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
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Default to null (Welcome screen) or staff for testing
  useEffect(() => {
    // Start on welcome screen by default, or auto-login for testing if desired
  }, []);

  const loginAsStaff = async (email?: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setUser({
        ...MOCK_STAFF_USER,
        email: email || MOCK_STAFF_USER.email,
      });
      setIsLoading(false);
    }, 400);
  };

  const loginAsStudent = async (email?: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setUser({
        ...MOCK_STUDENT_USER,
        email: email || MOCK_STUDENT_USER.email,
      });
      setIsLoading(false);
    }, 400);
  };

  const logout = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setUser(null);
      setIsLoading(false);
    }, 200);
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
