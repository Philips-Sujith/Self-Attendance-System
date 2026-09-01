export type UserRole = 'staff' | 'student';

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  mobile: string;
  department: string;
  rollNo?: string | null; // Student specific
  staffId?: string | null; // Staff specific
  classSection?: string | null; // Student specific
  createdAt: string;
}

export interface CourseGroup {
  id: string;
  name: string;
  code: string;
  section: string;
  staffId: string;
  staffName?: string;
  joinCode: string;
  scheduleDay: string; // e.g. "Monday"
  schedulePeriod: string; // e.g. "09:00 - 10:00 AM"
  studentCount?: number;
  createdAt: string;
}

export interface GroupMembership {
  id: string;
  groupId: string;
  studentId: string;
  joinedAt: string;
  student?: UserProfile;
}

export type SessionStatus = 'active' | 'closed';

export interface AttendanceSession {
  id: string;
  groupId: string;
  groupName?: string;
  groupCode?: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  period: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  durationMinutes: number;
  status: SessionStatus;
  networkSessionId: string;
  presentCount?: number;
  totalStudents?: number;
}

export type VerificationMethod = 'wifi_local_network' | 'manual_override';
export type AttendanceStatus = 'present' | 'late' | 'manual_override' | 'absent';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentName?: string;
  studentRollNo?: string;
  markedAt: string;
  verificationMethod: VerificationMethod;
  deviceId: string;
  status: AttendanceStatus;
  overrideReason?: string | null;
}
