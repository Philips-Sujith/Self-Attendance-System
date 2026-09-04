// ==============================================================================
// SAS — Attendance Session & Realtime Service (Pure Supabase Implementation)
// Zero Mock Data — Real PostgreSQL Database as Single Source of Truth
// ==============================================================================

import { supabase } from './supabase';
import { AttendanceRecord, AttendanceSession, AttendanceStatus, SessionStatus, VerificationMethod } from '../types';
import { groupService } from './groupService';
import { notificationService } from './notificationService';

export interface StartSessionParams {
  groupId: string;
  groupName?: string;
  groupCode?: string;
  staffId: string;
  date?: string; // YYYY-MM-DD
  period: string;
  durationMinutes: number;
}

export interface SessionRosterStudent {
  studentId: string;
  name: string;
  rollNo: string;
  email: string;
  department: string;
  status: AttendanceStatus;
  markedAt?: string;
  verificationMethod?: VerificationMethod;
  overrideReason?: string | null;
  deviceId?: string;
  recordId?: string;
}

export const sessionService = {
  // Generate standardized mDNS Network Session ID
  generateNetworkSessionId: (groupCode?: string): string => {
    const cleanCode = (groupCode || 'CLASS').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SAS-${cleanCode || 'CLASS'}-${suffix}`;
  },

  // Start a new Attendance Session in Supabase
  startAttendanceSession: async (
    params: StartSessionParams
  ): Promise<{ session: AttendanceSession | null; error: Error | null }> => {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + params.durationMinutes * 60 * 1000);
    const dateStr = params.date || startTime.toISOString().split('T')[0];
    const networkSessionId = sessionService.generateNetworkSessionId(params.groupCode);

    try {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
          group_id: params.groupId,
          staff_id: params.staffId,
          date: dateStr,
          period: params.period.trim(),
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: params.durationMinutes,
          status: 'active',
          network_session_id: networkSessionId,
        })
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create attendance session.');

      const createdSession: AttendanceSession = {
        id: data.id,
        groupId: data.group_id,
        groupName: params.groupName,
        groupCode: params.groupCode,
        staffId: data.staff_id,
        date: data.date,
        period: data.period,
        startTime: data.start_time,
        endTime: data.end_time,
        durationMinutes: data.duration_minutes,
        status: data.status as SessionStatus,
        networkSessionId: data.network_session_id,
      };

      // Dispatch Push Notification Alert to Enrolled Students
      notificationService.sendSessionStartNotifications(
        params.groupName || 'Course',
        params.groupCode || 'CLASS',
        createdSession
      );

      return {
        session: createdSession,
        error: null,
      };
    } catch (err: any) {
      console.error('Supabase startAttendanceSession error:', err);
      return { session: null, error: err };
    }
  },

  // Student marks attendance (WiFi Proximity Verified)
  markAttendanceSelf: async (params: {
    sessionId: string;
    studentId: string;
    deviceId: string;
    verificationMethod?: VerificationMethod;
  }): Promise<{ success: boolean; error?: string; markedAt?: string }> => {
    const timestamp = new Date().toISOString();
    const verificationMethod = params.verificationMethod || 'wifi_local_network';

    try {
      // 1. Verify session is currently active
      const { data: session, error: sessErr } = await supabase
        .from('attendance_sessions')
        .select('status, end_time')
        .eq('id', params.sessionId)
        .maybeSingle();

      if (sessErr || !session) {
        return { success: false, error: 'Attendance session not found or has ended.' };
      }

      if (session.status !== 'active' || new Date(session.end_time).getTime() < Date.now()) {
        return {
          success: false,
          error: 'This attendance session is now closed. Please request a manual override from your instructor.',
        };
      }

      // 2. Insert attendance record into Supabase (Anti-Proxy database constraints enforced)
      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          session_id: params.sessionId,
          student_id: params.studentId,
          marked_at: timestamp,
          verification_method: verificationMethod,
          device_id: params.deviceId,
          status: 'present',
        })
        .select('*')
        .single();

      if (error) {
        if (error.code === '23505') {
          if (error.message?.includes('unique_session_device')) {
            return {
              success: false,
              error: 'Anti-Proxy Triggered: This physical device has already submitted attendance for another student account in this session.',
            };
          }
          return {
            success: false,
            error: 'You have already marked your attendance for this session.',
          };
        }
        throw error;
      }

      return {
        success: true,
        markedAt: new Date(data.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    } catch (err: any) {
      console.error('Supabase markAttendanceSelf error:', err);
      return { success: false, error: err.message || 'Database error while marking attendance.' };
    }
  },

  // Fetch full roster combined with attendance records for a session
  getSessionRosterAndRecords: async (
    sessionId: string,
    groupId: string
  ): Promise<SessionRosterStudent[]> => {
    const enrolledStudents = await groupService.getCourseGroupRoster(groupId);
    if (!enrolledStudents || enrolledStudents.length === 0) {
      return [];
    }

    try {
      const { data: records, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('session_id', sessionId);

      const recordsMap = new Map<string, any>();
      if (records && !error) {
        records.forEach((r) => recordsMap.set(r.student_id, r));
      }

      return enrolledStudents.map((student) => {
        const mark = recordsMap.get(student.studentId);
        return {
          studentId: student.studentId,
          name: student.name,
          rollNo: student.rollNo,
          email: student.email,
          department: student.department,
          status: mark ? (mark.status as AttendanceStatus) : 'absent',
          markedAt: mark?.marked_at
            ? new Date(mark.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : undefined,
          verificationMethod: mark?.verification_method,
          overrideReason: mark?.override_reason,
          deviceId: mark?.device_id,
          recordId: mark?.id,
        };
      });
    } catch (err) {
      console.error('Error in getSessionRosterAndRecords:', err);
      return enrolledStudents.map((s) => ({
        studentId: s.studentId,
        name: s.name,
        rollNo: s.rollNo,
        email: s.email,
        department: s.department,
        status: 'absent' as AttendanceStatus,
      }));
    }
  },

  // Realtime subscription to live session attendance marks
  subscribeToSessionAttendance: (
    sessionId: string,
    onRecordChange: () => void
  ): (() => void) => {
    const channel = supabase
      .channel(`session-realtime-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          onRecordChange();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'attendance_sessions',
          filter: `id=eq.${sessionId}`,
        },
        () => {
          onRecordChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Get active session for student's enrolled courses
  getActiveSessionForStudent: async (studentId: string): Promise<AttendanceSession | null> => {
    try {
      // 1. Get group IDs student belongs to
      const { data: memberships, error: memErr } = await supabase
        .from('group_memberships')
        .select('group_id')
        .eq('student_id', studentId);

      if (memErr || !memberships || memberships.length === 0) {
        return null;
      }

      const groupIds = memberships.map((m) => m.group_id);

      // 2. Find any active session for these groups
      const { data: session, error: sessErr } = await supabase
        .from('attendance_sessions')
        .select(`
          id,
          group_id,
          staff_id,
          date,
          period,
          start_time,
          end_time,
          duration_minutes,
          status,
          network_session_id,
          course_groups:group_id (
            id,
            name,
            code,
            section
          )
        `)
        .in('group_id', groupIds)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessErr || !session) return null;

      const group: any = session.course_groups;
      return {
        id: session.id,
        groupId: session.group_id,
        groupName: group?.name || 'Active Course',
        groupCode: group?.code || 'CLASS',
        staffId: session.staff_id,
        date: session.date,
        period: session.period,
        startTime: session.start_time,
        endTime: session.end_time,
        durationMinutes: session.duration_minutes,
        status: session.status as SessionStatus,
        networkSessionId: session.network_session_id,
      };
    } catch (err) {
      console.error('Error fetching active session for student:', err);
      return null;
    }
  },

  // Get all past sessions for a Course Group
  getCourseSessions: async (groupId: string): Promise<AttendanceSession[]> => {
    try {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map((d: any) => ({
        id: d.id,
        groupId: d.group_id,
        staffId: d.staff_id,
        date: d.date,
        period: d.period,
        startTime: d.start_time,
        endTime: d.end_time,
        durationMinutes: d.duration_minutes,
        status: d.status as SessionStatus,
        networkSessionId: d.network_session_id,
      }));
    } catch (err) {
      console.error('Error fetching course sessions:', err);
      return [];
    }
  },

  // Manual Status Override by Staff
  manualRecordOverride: async (params: {
    sessionId: string;
    studentId: string;
    status: AttendanceStatus;
    reason: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const timestamp = new Date().toISOString();
    const cleanReason = (params.reason || '').trim();

    if (params.status !== 'absent' && cleanReason.length < 3) {
      return { success: false, error: 'Every manual status override requires an audit reason of at least 3 characters.' };
    }

    try {
      if (params.status === 'absent') {
        const { error } = await supabase
          .from('attendance_records')
          .delete()
          .eq('session_id', params.sessionId)
          .eq('student_id', params.studentId);

        if (error) throw error;
        return { success: true };
      }

      // Use a student-scoped device ID for overrides to prevent multi-student collisions on unique_session_device
      const overrideDeviceId = `STAFF_OVERRIDE_${params.studentId}`;

      const { error } = await supabase
        .from('attendance_records')
        .upsert(
          {
            session_id: params.sessionId,
            student_id: params.studentId,
            marked_at: timestamp,
            verification_method: 'manual_override',
            device_id: overrideDeviceId,
            status: params.status,
            override_reason: cleanReason,
          },
          { onConflict: 'session_id, student_id' }
        );

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      const code = err?.code || 'UNKNOWN';
      const rawMessage = err?.message || 'Failed to save status override.';
      console.error('Supabase manualRecordOverride error diagnostics:', {
        code,
        message: rawMessage,
        details: err?.details || null,
        hint: err?.hint || null,
        table: 'attendance_records',
        operation: params.status === 'absent' ? 'DELETE' : 'UPSERT',
        targetSessionId: params.sessionId,
        targetStudentId: params.studentId,
        targetStatus: params.status,
      });

      let userFriendlyError = rawMessage;
      if (code === '42501') {
        userFriendlyError = 'Database security policy rejected the override. Verify that you are the faculty instructor of this session and the student is enrolled.';
      } else if (code === '23505') {
        userFriendlyError = 'Attendance record conflict for this student in this session.';
      } else if (code === '23503') {
        userFriendlyError = 'Invalid session or student reference in the database.';
      }

      return { success: false, error: userFriendlyError };
    }
  },

  // Close an active Attendance Session
  closeAttendanceSession: async (sessionId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ status: 'closed' })
        .eq('id', sessionId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Supabase closeAttendanceSession error:', err);
      return false;
    }
  },
};
