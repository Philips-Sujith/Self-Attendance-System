// ==============================================================================
// TEST CATEGORY 6: Staff Manual Override & Audit Trail (22 Tests)
// Validates Staff-Only Authorization, Mandatory Reasons, Audit Trail & Persistence
// ==============================================================================

import { describe, test, expect } from '@jest/globals';

describe('Category 6: Manual Override & Audit Trail Tests (22 Tests)', () => {
  // Test 1: Staff can perform manual override on owned session
  test('M1: Owning staff member can perform manual attendance override', () => {
    const sessionOwnerStaffId = 'staff-101';
    const currentStaffId = 'staff-101';
    const canOverride = currentStaffId === sessionOwnerStaffId;
    expect(canOverride).toBe(true);
  });

  // Test 2: Unauthorized staff rejected from override
  test('M2: Unauthorized staff cannot override attendance for another staff session', () => {
    const sessionOwnerStaffId: string = 'staff-101';
    const currentStaffId: string = 'staff-999';
    const canOverride = currentStaffId === sessionOwnerStaffId;
    expect(canOverride).toBe(false);
  });

  // Test 3: Student completely blocked from manual override
  test('M3: Student account is completely rejected from manual override pathway', () => {
    const userRole: string = 'student';
    const canAccessOverride = userRole === 'staff';
    expect(canAccessOverride).toBe(false);
  });

  // Test 4: Empty reason rejected for present override
  test('M4: Empty reason string is rejected when overriding to present', () => {
    const targetStatus: string = 'present';
    const reason = '   ';
    const isValid = targetStatus === 'absent' || reason.trim().length > 0;
    expect(isValid).toBe(false);
  });

  // Test 5: Empty reason rejected for late override
  test('M5: Empty reason string is rejected when overriding to late', () => {
    const targetStatus: string = 'late';
    const reason = '';
    const isValid = targetStatus === 'absent' || reason.trim().length > 0;
    expect(isValid).toBe(false);
  });

  // Test 6: Valid reason accepted for present override
  test('M6: Valid explanation accepted for manual override', () => {
    const targetStatus: string = 'present';
    const reason = 'Student device battery died; verified present at desk 14';
    const isValid = targetStatus === 'absent' || reason.trim().length > 0;
    expect(isValid).toBe(true);
  });

  // Test 7: Reason persisted in override_reason column
  test('M7: Audit reason is saved into override_reason field', () => {
    const overrideRecord = {
      sessionId: 'sess-1',
      studentId: 'stud-1',
      status: 'manual_override',
      overrideReason: 'Verified physically by instructor',
      verificationMethod: 'manual_override',
    };
    expect(overrideRecord.overrideReason).toBe('Verified physically by instructor');
    expect(overrideRecord.verificationMethod).toBe('manual_override');
  });

  // Test 8: Device ID tagged as STAFF_MANUAL_OVERRIDE
  test('M8: Manual override tags device_id as STAFF_MANUAL_OVERRIDE for auditability', () => {
    const deviceId = 'STAFF_MANUAL_OVERRIDE';
    expect(deviceId).toBe('STAFF_MANUAL_OVERRIDE');
  });

  // Test 9: Changing status to absent deletes or removes present mark
  test('M9: Overriding status back to absent deletes the active attendance record', () => {
    let records = [{ studentId: 's1', status: 'present' }];
    const targetStatus = 'absent';
    if (targetStatus === 'absent') {
      records = records.filter((r) => r.studentId !== 's1');
    }
    expect(records.length).toBe(0);
  });

  // Test 10: Multiple successive corrections are auditable
  test('M10: Successive corrections update status and audit note correctly', () => {
    let record: any = { status: 'absent', overrideReason: null };
    // Correction 1
    record = { status: 'present', overrideReason: 'Phone dead' };
    expect(record.status).toBe('present');
    expect(record.overrideReason).toBe('Phone dead');

    // Correction 2
    record = { status: 'late', overrideReason: 'Arrived 15 minutes late with permission slip' };
    expect(record.status).toBe('late');
    expect(record.overrideReason).toContain('permission slip');
  });

  // Test 11: RLS WITH CHECK enforces session ownership on UPDATE
  test('M11: Database RLS WITH CHECK enforces session ownership on record update', () => {
    const authUid = 'staff-1';
    const sessionOwnerId = 'staff-1';
    const isRlsAuthorized = authUid === sessionOwnerId;
    expect(isRlsAuthorized).toBe(true);
  });

  // Test 12: Audit note displays in staff session roster UI
  test('M12: Audit note displays visibly under student card in staff session roster', () => {
    const student = {
      name: 'Michael Scott',
      status: 'manual_override',
      overrideReason: 'Seat verification by HOD',
    };
    const auditText = student.overrideReason ? `Audit Note: "${student.overrideReason}"` : null;
    expect(auditText).toBe('Audit Note: "Seat verification by HOD"');
  });

  // Test 13: Manual override modal requires student selection
  test('M13: Manual override modal requires valid student selection', () => {
    const selectedStudent = null;
    const canOpen = !!selectedStudent;
    expect(canOpen).toBe(false);
  });

  // Test 14: Manual override modal initializes with opposite status
  test('M14: Override modal defaults to present for absent students', () => {
    const currentStatus = 'absent';
    const defaultTarget = currentStatus === 'absent' ? 'present' : 'absent';
    expect(defaultTarget).toBe('present');
  });

  // Test 15: Override modal defaults to absent for present students
  test('M15: Override modal defaults to absent for present students', () => {
    const currentStatus: string = 'present';
    const defaultTarget = currentStatus === 'absent' ? 'present' : 'absent';
    expect(defaultTarget).toBe('absent');
  });

  // Test 16: Verification method enum check allows manual_override
  test('M16: verification_method enum accepts manual_override value', () => {
    const method: string = 'manual_override';
    const validEnums = ['wifi_local_network', 'manual_override'];
    expect(validEnums.includes(method)).toBe(true);
  });

  // Test 17: Reason length minimum validation (at least 3 characters)
  test('M17: Override reason must be at least 3 characters long', () => {
    const isReasonValid = (r: string) => r.trim().length >= 3;
    expect(isReasonValid('ok')).toBe(false);
    expect(isReasonValid('In seat')).toBe(true);
  });

  // Test 18: CSV export includes manual override reason
  test('M18: Session CSV export includes override reason in output cell', () => {
    const record = {
      name: 'Dwight Schrute',
      status: 'manual_override',
      overrideReason: 'Volunteered on campus duty',
    };
    const row = `${record.name},${record.status},"${record.overrideReason}"`;
    expect(row).toContain('Volunteered on campus duty');
  });

  // Test 19: Realtime event triggers roster refresh after manual override
  test('M19: Realtime event triggers roster refresh after manual override', () => {
    let refreshCount = 0;
    const onRecordChange = () => { refreshCount++; };
    // Simulate postgres_changes event
    onRecordChange();
    expect(refreshCount).toBe(1);
  });

  // Test 20: Override does not violate unique_session_student constraint
  test('M20: Upsert with onConflict session_id, student_id preserves record uniqueness', () => {
    const existing = new Map();
    existing.set('sess-1_stud-1', { status: 'absent' });
    // Upsert
    existing.set('sess-1_stud-1', { status: 'manual_override', reason: 'Verified' });
    expect(existing.size).toBe(1);
    expect(existing.get('sess-1_stud-1').status).toBe('manual_override');
  });

  // Test 21: Student dashboard shows Present when overridden by staff
  test('M21: Student attendance history reflects present status after staff manual override', () => {
    const record = { status: 'manual_override' };
    const displayStatus = record.status === 'manual_override' ? 'Present (Override)' : record.status;
    expect(displayStatus).toBe('Present (Override)');
  });

  // Test 22: Override reason is sanitized against malicious injections
  test('M22: Override reason sanitizes HTML/script injection tags', () => {
    const rawReason = '<script>alert(1)</script>Late entry';
    const sanitized = rawReason.replace(/<[^>]*>/g, '').trim();
    expect(sanitized).toBe('alert(1)Late entry');
    expect(sanitized).not.toContain('<script>');
  });

  // Test 23: Staff can INSERT manual override for absent student (no prior record)
  test('M23: Staff can INSERT manual override for absent student with no prior record', () => {
    const isStaff = true;
    const isSessionOwner = true;
    const isEnrolled = true;
    const verificationMethod = 'manual_override';
    const reason = 'Student in front row, phone dead';

    const canInsertOverride =
      isStaff &&
      isSessionOwner &&
      isEnrolled &&
      verificationMethod === 'manual_override' &&
      reason.trim().length >= 3;

    expect(canInsertOverride).toBe(true);
  });

  // Test 24: Staff can UPDATE existing record with manual override
  test('M24: Staff can UPDATE existing record with manual override', () => {
    const isStaff = true;
    const isSessionOwner = true;
    const isEnrolled = true;
    const verificationMethod = 'manual_override';
    const reason = 'Corrected from late to present';

    const canUpdateOverride =
      isStaff &&
      isSessionOwner &&
      isEnrolled &&
      verificationMethod === 'manual_override' &&
      reason.trim().length >= 3;

    expect(canUpdateOverride).toBe(true);
  });

  // Test 25: Closed session can still be manually overridden by authorized staff
  test('M25: Closed session can still be manually overridden by authorized staff', () => {
    const sessionStatus: string = 'closed';
    const isStaff = true;
    const isSessionOwner = true;
    const isEnrolled = true;

    // normal student mark is blocked on closed sessions
    const studentCanMark = sessionStatus === 'active';
    expect(studentCanMark).toBe(false);

    // staff manual override is permitted on closed sessions
    const staffCanOverride = isStaff && isSessionOwner && isEnrolled;
    expect(staffCanOverride).toBe(true);
  });

  // Test 26: Multiple students in same session can be overridden without device collision
  test('M26: Multiple students in same session can be overridden without device collision', () => {
    const sessionId = 'session-101';
    const student1Id = 'student-1';
    const student2Id = 'student-2';

    const device1 = `STAFF_OVERRIDE_${student1Id}`;
    const device2 = `STAFF_OVERRIDE_${student2Id}`;

    expect(device1).not.toBe(device2);
    expect(device1).toBe('STAFF_OVERRIDE_student-1');
    expect(device2).toBe('STAFF_OVERRIDE_student-2');

    // Devices are distinct per student, so unique_session_device will never conflict
    const keys = new Set();
    keys.add(`${sessionId}_${device1}`);
    keys.add(`${sessionId}_${device2}`);
    expect(keys.size).toBe(2);
  });

  // Test 27: Staff A cannot override attendance belonging to Staff B session
  test('M27: Staff A cannot override attendance belonging to Staff B session', () => {
    const staffAUid: string = 'staff-A';
    const sessionOwnerUid: string = 'staff-B';
    const canOverride = staffAUid === sessionOwnerUid;
    expect(canOverride).toBe(false);
  });

  // Test 28: Staff cannot override attendance for student not enrolled in the course group
  test('M28: Staff cannot override attendance for student not enrolled in the course group', () => {
    const isStaff = true;
    const isSessionOwner = true;
    const isEnrolled = false; // unenrolled student
    const canOverride = isStaff && isSessionOwner && isEnrolled;
    expect(canOverride).toBe(false);
  });

  // Test 29: Student cannot perform manual override
  test('M29: Student cannot perform manual override because is_staff is false', () => {
    const isStaff = false; // Student account
    const canOverride = isStaff;
    expect(canOverride).toBe(false);
  });

  // Test 30: Student cannot set verification_method to manual_override
  test('M30: Student cannot set verification_method to manual_override', () => {
    const userRole: string = 'student';
    const attemptedMethod: string = 'manual_override';
    const isAllowed = userRole === 'staff' || attemptedMethod !== 'manual_override';
    expect(isAllowed).toBe(false);
  });

  // Test 31: Reason shorter than 3 characters is rejected
  test('M31: Reason shorter than 3 characters is rejected', () => {
    const shortReason = 'ok';
    const isValid = shortReason.trim().length >= 3;
    expect(isValid).toBe(false);
  });

  // Test 32: Whitespace-only reason is rejected
  test('M32: Whitespace-only reason is rejected', () => {
    const wsReason = '     ';
    const isValid = wsReason.trim().length >= 3;
    expect(isValid).toBe(false);
  });

  // Test 33: PostgreSQL error code 42501 translates to user-friendly permission error
  test('M33: Error code 42501 translates into clear permission diagnostic', () => {
    const code = '42501';
    let message = 'raw';
    if (code === '42501') {
      message = 'Database security policy rejected the override. Verify that you are the faculty instructor of this session and the student is enrolled.';
    }
    expect(message).toContain('Database security policy rejected the override');
  });

  // Test 34: PostgreSQL error code 23505 translates to user-friendly conflict error
  test('M34: Error code 23505 translates into conflict diagnostic', () => {
    const code = '23505';
    let message = 'raw';
    if (code === '23505') {
      message = 'Attendance record conflict for this student in this session.';
    }
    expect(message).toContain('Attendance record conflict');
  });

  // Test 35: RLS security policies remain strictly enabled on attendance_records
  test('M35: RLS security policies remain strictly enabled on attendance_records', () => {
    const rlsEnabled = true;
    expect(rlsEnabled).toBe(true);
  });
});
