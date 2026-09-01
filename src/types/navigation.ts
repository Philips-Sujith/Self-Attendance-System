import { NavigatorScreenParams } from '@react-navigation/native';
import { CourseGroup, AttendanceSession } from './index';

// Auth Stack Navigation Params
export type AuthStackParamList = {
  Welcome: undefined;
  StaffAuth: { mode: 'login' | 'register' };
  StudentAuth: { mode: 'login' | 'register' };
};

// Staff Navigation Params
export type StaffTabParamList = {
  StaffGroupsTab: undefined;
  StaffLiveSessionTab: { sessionId?: string } | undefined;
  StaffProfileTab: undefined;
};

export type StaffStackParamList = {
  StaffTabs: NavigatorScreenParams<StaffTabParamList>;
  StaffGroupDetail: { group: CourseGroup };
  StaffCreateGroup: undefined;
  StaffRoster: { group: CourseGroup };
  StaffStartSession: { group: CourseGroup };
  StaffSessionLive: { session: AttendanceSession };
  StaffSessionReport: { session: AttendanceSession };
};

// Student Navigation Params
export type StudentTabParamList = {
  StudentCoursesTab: undefined;
  StudentActivityTab: undefined;
  StudentProfileTab: undefined;
};

export type StudentStackParamList = {
  StudentTabs: NavigatorScreenParams<StudentTabParamList>;
  StudentJoinGroup: undefined;
  StudentCourseDetail: { group: CourseGroup };
  StudentMarkAttendance: { session: AttendanceSession };
};

// Root Stack Params
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Staff: NavigatorScreenParams<StaffStackParamList>;
  Student: NavigatorScreenParams<StudentStackParamList>;
};
