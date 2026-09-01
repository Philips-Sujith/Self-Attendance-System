import { supabase } from './supabase';
import { AttendanceRecord, AttendanceSession, AttendanceStatus, SessionStatus, VerificationMethod } from '../types';
import { ENV } from '../config/env';
import { groupService } from './groupService';

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

// In-memory fallback session records
let MOCK_SESSIONS: { [id: string]: AttendanceSession } = {
  'sess-active-01': {
    id: 'sess-active-01',
    groupId: 'grp-001',
    groupName: 'Digital System Design (DSD)',
    groupCode: 'CS302',
    staffId: 'staff-001',
    date: new Date().toISOString().split('T')[0],
    period: '09:00 - 10:00 AM',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
    durationMinutes: 5,
    status: 'active',
    networkSessionId: 'SAS-CS302-8F92',
  },
};

let MOCK_RECORDS: { [sessionId: string]: AttendanceRecord[] } = {
  'sess-active-01': [
    {
      id: 'rec-01',
      sessionId: 'sess-active-01',
      studentId: 'student-002',
      markedAt: new Date(Date.now() - 60000).toISOString(),
      verificationMethod: 'wifi_local_network',
      deviceId: 'DEV-IPHONE-1022',
      status: 'present',
    },
    {
      id: 'rec-02',
      sessionId: 'sess-active-01',
      studentId: 'student-003',
      markedAt: new Date(Date.now() - 45000).toISOString(),
      verificationMethod: 'wifi_local_network',
      deviceId: 'DEV-SAMS-9912',
      status: 'present',
    },
  ],
};

type RecordChangeCallback = (records: AttendanceRecord[]) => void;
const realtimeSubscribers = new Map<string, Set<RecordChangeCallback>>();

export const sessionService = {
  // Start a new Attendance Session
  startAttendanceSession: async (
    params: StartSessionParams
  ): Promise<{ session: AttendanceSession | null; error: Error | null }> => {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + params.durationMinutes * 60 * 1000);
    const dateStr = params.date || startTime.toISOString().split('T')[0];
    const networkSessionId = `SAS-${params.groupCode || 'COURSE'}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    if (!ENV.isSupabaseConfigured()) {
      const newSession: AttendanceSession = {
        id: 'sess-' + Date.now(),
        groupId: params.groupId,
        groupName: params.groupName,
        groupCode: params.groupCode,
        staffId: params.staffId,
        date: dateStr,
        period: params.period,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationMinutes: params.durationMinutes,
        status: 'active',
        networkSessionId,
      };

      MOCK_SESSIONS[newSession.id] = newSession;
      MOCK_RECORDS[newSession.id] = [];
      return { session: newSession, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
          group_id: params.groupId,
          staff_id: params.staffId,
          date: dateStr,
          period: params.period,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: params.durationMinutes,
          status: 'active',
          network_session_id: networkSessionId,
        })
        .select('*')
        .single();

      if (error) throw error;

      return {
        session: {
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
        },
        error: null,
      };
    } catch (err: any) {
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

    if (!ENV.isSupabaseConfigured()) {
      const session = MOCK_SESSIONS[params.sessionId];
      if (!session || session.status !== 'active') {
        return { success: false, error: 'This session is closed. Late attendance cannot be marked.' };
      }

      let records = MOCK_RECORDS[params.sessionId] || [];
      const alreadyMarked = records.some((r) => r.studentId === params.studentId);
      if (alreadyMarked) {
        return { success: false, error: 'You have already marked attendance for this session.' };
      }

      const duplicateDevice = records.some((r) => r.deviceId === params.deviceId);
      if (duplicateDevice) {
        return { success: false, error: 'Anti-Proxy Triggered: This device has already been used to mark attendance for another student account.' };
      }

      const newRecord: AttendanceRecord = {
        id: 'rec-' + Date.now(),
        sessionId: params.sessionId,
        studentId: params.studentId,
        markedAt: timestamp,
        verificationMethod,
        deviceId: params.deviceId,
        status: 'present',
      };

      records.push(newRecord);
      MOCK_RECORDS[params.sessionId] = records;

      // Trigger local realtime subscribers
      const subs = realtimeSubscribers.get(params.sessionId);
      if (subs) {
        subs.forEach((cb) => cb([...records]));
      }

      return { success: true, markedAt: new Date(timestamp).toLocaleTimeString() };
    }

    try {
      // 1. Check if session is active
      const { data: session, error: sessErr } = await supabase
        .from('attendance_sessions')
        .select('status, end_time')
        .eq('id', params.sessionId)
        .single();

      if (sessErr || !session || session.status !== 'active') {
        return { success: false, error: 'This attendance session has ended. Please request a manual override from your instructor.' };
      }

      // 2. Insert attendance record
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
            return { success: false, error: 'Anti-Proxy Rule: This device has already been used for another student in this session.' };
          }
          return { success: false, error: 'You have already marked your attendance for this session.' };
        }
        throw error;
      }

      return { success: true, markedAt: new Date(timestamp).toLocaleTimeString() };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to mark attendance.' };
    }
  },

  // Fetch full roster combined with attendance records for a session
  getSessionRosterAndRecords: async (
    sessionId: string,
    groupId: string
  ): Promise<SessionRosterStudent[]> => {
    const enrolledStudents = await groupService.getCourseGroupRoster(groupId);

    if (!ENV.isSupabaseConfigured()) {
      const records = MOCK_RECORDS[sessionId] || [];
      return enrolledStudents.map((student) => {
        const mark = records.find((r) => r.studentId === student.studentId);
        return {
          studentId: student.studentId,
          name: student.name,
          rollNo: student.rollNo,
          email: student.email,
          department: student.department,
          status: mark ? mark.status : 'absent',
          markedAt: mark?.markedAt ? new Date(mark.markedAt).toLocaleTimeString() : undefined,
          verificationMethod: mark?.verificationMethod,
          overrideReason: mark?.overrideReason,
          deviceId: mark?.deviceId,
          recordId: mark?.id,
        };
      });
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
          markedAt: mark?.marked_at ? new Date(mark.marked_at).toLocaleTimeString() : undefined,
          verificationMethod: mark?.verification_method,
          overrideReason: mark?.override_reason,
          deviceId: mark?.device_id,
          recordId: mark?.id,
        };
      });
    } catch (e) {
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
    if (!ENV.isSupabaseConfigured()) {
      let subs = realtimeSubscribers.get(sessionId);
      if (!subs) {
        subs = new Set();
        realtimeSubscribers.set(sessionId, subs);
      }
      const cb = () => onRecordChange();
      subs.add(cb);

      return () => {
        const currentSubs = realtimeSubscribers.get(sessionId);
        if (currentSubs) {
          currentSubs.delete(cb);
        }
      };
    }

    // Live Supabase Realtime Channel
    const channel = supabase
      .channel(`live-session-${sessionId}`)
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
    if (!ENV.isSupabaseConfigured()) {
      const active = Object.values(MOCK_SESSIONS).find((s) => s.status === 'active');
      return active || null;
    }

    try {
      // Find active sessions in courses student belongs to
      const { data, error } = await supabase
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
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      const group: any = data.course_groups;
      return {
        id: data.id,
        groupId: data.group_id,
        groupName: group?.name || 'Active Course',
        groupCode: group?.code || 'CLASS',
        staffId: data.staff_id,
        date: data.date,
        period: data.period,
        startTime: data.start_time,
        endTime: data.end_time,
        durationMinutes: data.duration_minutes,
        status: data.status as SessionStatus,
        networkSessionId: data.network_session_id,
      };
    } catch (e) {
      return null;
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

    if (!ENV.isSupabaseConfigured()) {
      let records = MOCK_RECORDS[params.sessionId] || [];
      const existingIdx = records.findIndex((r) => r.studentId === params.studentId);

      if (params.status === 'absent') {
        if (existingIdx >= 0) records.splice(existingIdx, 1);
      } else {
        const newRecord: AttendanceRecord = {
          id: 'rec-' + Date.now(),
          sessionId: params.sessionId,
          studentId: params.studentId,
          markedAt: timestamp,
          verificationMethod: 'manual_override',
          deviceId: 'STAFF_MANUAL_OVERRIDE',
          status: params.status,
          overrideReason: params.reason,
        };

        if (existingIdx >= 0) records[existingIdx] = newRecord;
        else records.push(newRecord);
      }

      MOCK_RECORDS[params.sessionId] = records;

      const subs = realtimeSubscribers.get(params.sessionId);
      if (subs) subs.forEach((cb) => cb([...records]));

      return { success: true };
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

      const { error } = await supabase
        .from('attendance_records')
        .upsert(
          {
            session_id: params.sessionId,
            student_id: params.studentId,
            marked_at: timestamp,
            verification_method: 'manual_override',
            device_id: 'STAFF_MANUAL_OVERRIDE',
            status: params.status,
            override_reason: params.reason,
          },
          { onConflict: 'session_id, student_id' }
        );

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save status override.' };
    }
  },

  // Close an active Attendance Session
  closeAttendanceSession: async (sessionId: string): Promise<boolean> => {
    if (!ENV.isSupabaseConfigured()) {
      if (MOCK_SESSIONS[sessionId]) {
        MOCK_SESSIONS[sessionId].status = 'closed';
      }
      return true;
    }

    try {
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ status: 'closed' })
        .eq('id', sessionId);

      return !error;
    } catch (e) {
      return false;
    }
  },
};
