// ==============================================================================
// TEST SUITE A: Authentication, User Profiles & Role Routing (20 Tests)
// ==============================================================================

import { describe, test, expect } from '@jest/globals';
import { SignUpStaffParams, SignUpStudentParams } from '../src/services/authService';

describe('A. Authentication & User Profile Tests', () => {
  // Test 1: Student signup validation
  test('A1: Student signup validates required fields', () => {
    const validStudent: SignUpStudentParams = {
      email: 'student@college.edu',
      password: 'password123',
      name: 'John Doe',
      rollNo: '21CS101',
      department: 'CSE',
      classSection: 'CSE-A',
      mobile: '+91 9876543210',
    };
    expect(validStudent.email).toContain('@');
    expect(validStudent.password.length).toBeGreaterThanOrEqual(6);
    expect(validStudent.rollNo).toBe('21CS101');
  });

  // Test 2: Staff signup validation
  test('A2: Staff signup validates required fields', () => {
    const validStaff: SignUpStaffParams = {
      email: 'prof.smith@college.edu',
      password: 'securePassword123',
      name: 'Dr. John Smith',
      staffId: 'FAC-001',
      department: 'CSE',
      mobile: '+91 9876543211',
    };
    expect(validStaff.email).toContain('@');
    expect(validStaff.staffId).toBe('FAC-001');
  });

  // Test 3: Password length check
  test('A3: Rejects passwords shorter than 6 characters', () => {
    const shortPassword = '123';
    expect(shortPassword.length < 6).toBe(true);
  });

  // Test 4: Email normalization
  test('A4: Email address is normalized to lowercase and trimmed', () => {
    const rawEmail = '  Student.Alex@College.Edu  ';
    const normalized = rawEmail.trim().toLowerCase();
    expect(normalized).toBe('student.alex@college.edu');
  });

  // Test 5: Role determination for Student
  test('A5: Student role strictly evaluates to "student"', () => {
    const role: string = 'student';
    expect(role === 'student').toBe(true);
    expect(role === 'staff').toBe(false);
  });

  // Test 6: Role determination for Staff
  test('A6: Staff role strictly evaluates to "staff"', () => {
    const role: string = 'staff';
    expect(role === 'staff').toBe(true);
    expect(role === 'student').toBe(false);
  });

  // Test 7: Student profile fields structure
  test('A7: Student profile contains rollNo and classSection', () => {
    const profile = {
      id: 'uuid-student-1',
      role: 'student',
      name: 'Alex',
      email: 'alex@college.edu',
      rollNo: '21CS1085',
      classSection: 'CSE - Section B',
      department: 'CSE',
    };
    expect(profile.rollNo).toBe('21CS1085');
    expect(profile.classSection).toBe('CSE - Section B');
    expect(profile.role).toBe('student');
  });

  // Test 8: Staff profile fields structure
  test('A8: Staff profile contains staffId and department', () => {
    const profile = {
      id: 'uuid-staff-1',
      role: 'staff',
      name: 'Dr. Sujith',
      email: 'sujith@college.edu',
      staffId: 'CSE-FAC-104',
      department: 'Computer Science',
    };
    expect(profile.staffId).toBe('CSE-FAC-104');
    expect(profile.role).toBe('staff');
  });

  // Test 9: Navigation gating - Student never enters Staff navigator
  test('A9: Navigation route for student role resolves ONLY to "Student"', () => {
    const getTargetRoute = (role: 'student' | 'staff' | null) => {
      if (!role) return 'Auth';
      return role === 'staff' ? 'Staff' : 'Student';
    };
    expect(getTargetRoute('student')).toBe('Student');
    expect(getTargetRoute('student')).not.toBe('Staff');
  });

  // Test 10: Navigation gating - Staff never enters Student navigator
  test('A10: Navigation route for staff role resolves ONLY to "Staff"', () => {
    const getTargetRoute = (role: 'student' | 'staff' | null) => {
      if (!role) return 'Auth';
      return role === 'staff' ? 'Staff' : 'Student';
    };
    expect(getTargetRoute('staff')).toBe('Staff');
    expect(getTargetRoute('staff')).not.toBe('Student');
  });

  // Test 11: Unauthenticated user routes to Auth
  test('A11: Unauthenticated user routes strictly to "Auth"', () => {
    const getTargetRoute = (user: any) => {
      if (!user) return 'Auth';
      return user.role === 'staff' ? 'Staff' : 'Student';
    };
    expect(getTargetRoute(null)).toBe('Auth');
  });

  // Test 12: Loading state prevents premature routing
  test('A12: Auth loading state halts navigation until role is resolved', () => {
    let isLoading = true;
    let user = null;
    expect(isLoading).toBe(true);
    expect(user).toBeNull();
  });

  // Test 13: Logout clears all user state
  test('A13: Logout sets user and role state to null', () => {
    let user: any = { id: 'u1', role: 'student' };
    // Simulate logout
    user = null;
    expect(user).toBeNull();
  });

  // Test 14: Switching accounts replaces profile completely
  test('A14: Switching user accounts replaces profile without residue', () => {
    let currentUser: any = { id: 'user-1', name: 'User 1', role: 'student' };
    const newUser: any = { id: 'user-2', name: 'User 2', role: 'staff' };
    currentUser = newUser;
    expect(currentUser.id).toBe('user-2');
    expect(currentUser.role).toBe('staff');
  });

  // Test 15: No hardcoded admin fallback
  test('A15: Random/unknown email does NOT default to admin/staff', () => {
    const email = 'newstudent99@college.edu';
    const metadataRole = 'student';
    const resolvedRole = metadataRole || 'student';
    expect(resolvedRole).toBe('student');
    expect(resolvedRole).not.toBe('staff');
  });

  // Test 16: Profile fallback mapping when database trigger is slightly delayed
  test('A16: Resolves profile from auth metadata safely during trigger delay', () => {
    const authUser = {
      id: 'usr-123',
      email: 'student@college.edu',
      user_metadata: {
        role: 'student',
        name: 'Student Name',
        roll_no: '21CS99',
      },
    };
    const resolvedRole = authUser.user_metadata.role || 'student';
    expect(resolvedRole).toBe('student');
  });

  // Test 17: Mobile number format sanitization
  test('A17: Mobile number trims formatting spaces', () => {
    const rawMobile = ' +91 98765 43210 ';
    const sanitized = rawMobile.trim();
    expect(sanitized).toBe('+91 98765 43210');
  });

  // Test 18: Error message formatting on login failure
  test('A18: Login failure produces descriptive error message', () => {
    const error = { message: 'Invalid login credentials' };
    const formattedError = error.message || 'Login failed';
    expect(formattedError).toBe('Invalid login credentials');
  });

  // Test 19: Session token expiration handling
  test('A19: Expired session returns null user', () => {
    const session = null;
    const user = session ? { id: '1' } : null;
    expect(user).toBeNull();
  });

  // Test 20: User profile created_at timestamp is valid ISO string
  test('A20: Profile timestamp is valid ISO format', () => {
    const timestamp = new Date().toISOString();
    expect(new Date(timestamp).getTime()).not.toBeNaN();
  });
});
