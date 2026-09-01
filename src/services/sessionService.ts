import { supabase } from './supabase';
import { AttendanceRecord, AttendanceSession, AttendanceStatus, SessionStatus, UserProfile } from '../types';
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
  verificationMethod?: 'wifi_local_network' | 'manual_override';
  overrideReason?: string | null;
  deviceId?: string;
  recordId?: string;
}

// In-memory fallback session records
let MOCK_SESSIONS: { [id: string]: AttendanceSession } = {};
let MOCK_RECORDS: { [sessionId: string]: AttendanceRecord[] } = {};

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

  // Fetch full roster combined with attendance records for a session
  getSessionRosterAndRecords: async (
    sessionId: string,
    groupId: string
  ): Promise<SessionRosterStudent[]> => {
    // 1. Get all enrolled students in group
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
      // 2. Fetch all recorded marks for this session from Supabase
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

  // Manual Status Override by Staff (with mandatory reason)
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
        // If changing back to absent, remove mark
        if (existingIdx >= 0) {
          records.splice(existingIdx, 1);
        }
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

        if (existingIdx >= 0) {
          records[existingIdx] = newRecord;
        } else {
          records.push(newRecord);
        }
      }

      MOCK_RECORDS[params.sessionId] = records;
      return { success: true };
    }

    try {
      if (params.status === 'absent') {
        // Delete record if set back to absent
        const { error } = await supabase
          .from('attendance_records')
          .delete()
          .eq('session_id', params.sessionId)
          .eq('student_id', params.studentId);

        if (error) throw error;
        return { success: true };
      }

      // Upsert record with override status and reason
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
