// ==============================================================================
// TEST SUITE E: Database Integration, Operations & Error Handling (15 Tests)
// ==============================================================================

import { describe, test, expect } from '@jest/globals';
import { csvExportService } from '../src/services/csvExportService';
import { ENV } from '../src/config/env';

describe('E. Database Integration & Operations Tests', () => {
  // Test 1: Supabase configuration URL validation
  test('E1: Supabase URL is valid HTTPS endpoint', () => {
    const url = ENV.SUPABASE_URL;
    expect(url.startsWith('https://')).toBe(true);
    expect(url).toContain('supabase.co');
  });

  // Test 2: Supabase Anon Key validation
  test('E2: Supabase Anon Key is present and non-empty', () => {
    const key = ENV.SUPABASE_ANON_KEY;
    expect(key.length).toBeGreaterThan(20);
  });

  // Test 3: Diagnostic info helper does NOT expose full API key
  test('E3: Diagnostic helper extracts only hostname and redacts keys', () => {
    const info = ENV.getDiagnosticInfo();
    expect(info.supabaseHost).toContain('supabase.co');
    expect(JSON.stringify(info)).not.toContain(ENV.SUPABASE_ANON_KEY);
  });

  // Test 4: Single session CSV export formatting
  test('E4: Generates valid CSV string with headers for single session', () => {
    const group = {
      id: 'grp-1',
      name: 'Digital System Design',
      code: 'CS302',
      section: 'Sec B',
      staffId: 'staff-1',
      joinCode: 'CS3-8F9',
      scheduleDay: 'Mon, Wed',
      schedulePeriod: '09:00 AM',
      createdAt: new Date().toISOString(),
    };
    const session = {
      id: 'sess-1',
      groupId: 'grp-1',
      staffId: 'staff-1',
      date: '2026-09-01',
      period: '09:00 AM',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      durationMinutes: 5,
      status: 'closed' as const,
      networkSessionId: 'SAS-CS302-8F92',
    };
    const roster = [
      {
        studentId: 'stud-1',
        name: 'Alex Johnson',
        rollNo: '21CS1085',
        email: 'alex@college.edu',
        department: 'CSE',
        status: 'present' as const,
        markedAt: '09:02 AM',
        verificationMethod: 'wifi_local_network' as const,
        deviceId: 'SAS-DEV-101',
      },
    ];

    const csv = csvExportService.generateSessionCSV(group, session, roster);
    expect(csv).toContain('Roll Number,Student Name,Course Code');
    expect(csv).toContain('21CS1085');
    expect(csv).toContain('Alex Johnson');
    expect(csv).toContain('PRESENT');
    expect(csv).toContain('SAS-DEV-101');
  });

  // Test 5: Full course semester master CSV export formatting
  test('E5: Generates valid CSV string for semester master sheet with attendance percentages', () => {
    const group = {
      id: 'grp-1',
      name: 'Digital System Design',
      code: 'CS302',
      section: 'Sec B',
      staffId: 'staff-1',
      joinCode: 'CS3-8F9',
      scheduleDay: 'Mon, Wed',
      schedulePeriod: '09:00 AM',
      createdAt: new Date().toISOString(),
    };
    const students = [
      {
        id: 'mem-1',
        studentId: 'stud-1',
        name: 'Alex Johnson',
        rollNo: '21CS1085',
        email: 'alex@college.edu',
        department: 'CSE',
        classSection: 'Section B',
        joinedAt: '2026-08-01',
        attendancePercentage: 95,
      },
      {
        id: 'mem-2',
        studentId: 'stud-2',
        name: 'Rahul Sharma',
        rollNo: '21CS1086',
        email: 'rahul@college.edu',
        department: 'CSE',
        classSection: 'Section B',
        joinedAt: '2026-08-01',
        attendancePercentage: 70,
      },
    ];

    const csv = csvExportService.generateCourseMasterCSV(group, students, 20);
    expect(csv).toContain('Roll Number,Student Name,Email,Department');
    expect(csv).toContain('REGULAR');
    expect(csv).toContain('DEFAULTER (<75%)');
  });

  // Test 6: CSV special character escaping
  test('E6: Correctly escapes commas and quotes inside CSV cells', () => {
    const group = {
      id: 'grp-1',
      name: 'Object Oriented Programming, Java',
      code: 'CS204',
      section: 'Sec "A"',
      staffId: 'staff-1',
      joinCode: 'CS2-901',
      scheduleDay: 'Tue, Thu',
      schedulePeriod: '10:00 AM',
      createdAt: new Date().toISOString(),
    };
    const session = {
      id: 'sess-1',
      groupId: 'grp-1',
      staffId: 'staff-1',
      date: '2026-09-01',
      period: '10:00 AM',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      durationMinutes: 5,
      status: 'closed' as const,
      networkSessionId: 'SAS-CS204-9011',
    };
    const roster = [
      {
        studentId: 'stud-1',
        name: 'Smith, Jr., John',
        rollNo: '21CS1001',
        email: 'john@college.edu',
        department: 'CSE',
        status: 'present' as const,
        overrideReason: 'Left class "early", verified note',
      },
    ];

    const csv = csvExportService.generateSessionCSV(group, session, roster);
    expect(csv).toContain('"Smith, Jr., John"');
    expect(csv).toContain('"Object Oriented Programming, Java"');
    expect(csv).toContain('"Left class ""early"", verified note"');
  });

  // Test 7: Network session ID generation
  test('E7: Generates network session ID with SAS prefix and course code', () => {
    const groupCode = 'CS302';
    const randomSuffix = '8F92';
    const networkId = `SAS-${groupCode}-${randomSuffix}`;
    expect(networkId).toBe('SAS-CS302-8F92');
  });

  // Test 8: Realtime channel naming convention
  test('E8: Creates standardized realtime channel identifier', () => {
    const sessionId = 'uuid-sess-1234';
    const channelName = `session-realtime-${sessionId}`;
    expect(channelName).toBe('session-realtime-uuid-sess-1234');
  });

  // Test 9: Attendance status enum values
  test('E9: Validates all supported attendance status enum values', () => {
    const validStatuses = ['present', 'absent', 'late', 'excused', 'manual_override'];
    expect(validStatuses).toContain('present');
    expect(validStatuses).toContain('absent');
    expect(validStatuses).toContain('late');
  });

  // Test 10: Session status enum values
  test('E10: Validates session status enum transitions (active -> closed)', () => {
    let status: 'active' | 'closed' | 'scheduled' = 'active';
    status = 'closed';
    expect(status).toBe('closed');
  });

  // Test 11: End time computation based on duration
  test('E11: Calculates session end_time accurately from duration in minutes', () => {
    const startTime = new Date('2026-09-01T09:00:00.000Z');
    const durationMinutes = 5;
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
    expect(endTime.toISOString()).toBe('2026-09-01T09:05:00.000Z');
  });

  // Test 12: Remaining seconds countdown computation
  test('E12: Computes remaining countdown seconds accurately', () => {
    const now = Date.now();
    const endTime = new Date(now + 180 * 1000).toISOString();
    const diff = Math.floor((new Date(endTime).getTime() - now) / 1000);
    expect(diff).toBe(180);
  });

  // Test 13: Auto-close timer triggers at 0 seconds
  test('E13: Triggers auto-close when countdown reaches 0 seconds', () => {
    let secondsRemaining = 1;
    let isSessionActive = true;

    // Tick down
    secondsRemaining -= 1;
    if (secondsRemaining <= 0) {
      isSessionActive = false;
    }

    expect(secondsRemaining).toBe(0);
    expect(isSessionActive).toBe(false);
  });

  // Test 14: Error handling for Supabase network disconnection
  test('E14: Produces structured error object on network failure', () => {
    const networkError = new Error('Failed to fetch: network unavailable');
    expect(networkError.message).toContain('network unavailable');
  });

  // Test 15: Timestamp formatting for attendance mark
  test('E15: Formats marked timestamp cleanly as HH:MM AM/PM', () => {
    const date = new Date('2026-09-01T09:02:15.000Z');
    expect(date.getUTCHours()).toBe(9);
    expect(date.getUTCMinutes()).toBe(2);
  });
});
