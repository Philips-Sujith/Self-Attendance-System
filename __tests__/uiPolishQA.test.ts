// ==============================================================================
// SAS — UI Polish & Final QA Validation Test Suite
// Rigorous verification of PDF styling, Profile alignment, and Single Icon UI
// ==============================================================================

import { describe, test, expect } from '@jest/globals';
import { pdfExportService } from '../src/services/pdfExportService';
import { CourseGroup, AttendanceSession } from '../src/types';
import { SessionRosterStudent } from '../src/services/sessionService';

describe('Final UI Polish & QA Verification', () => {
  const sampleGroup: CourseGroup = {
    id: 'grp-qa-01',
    name: 'Computer Networks & Security',
    code: 'CS401',
    section: 'Section A',
    staffId: 'staff-qa-01',
    staffName: 'Prof. Ada Lovelace',
    joinCode: 'NET-401',
    scheduleDay: 'Monday, Wednesday, Friday',
    schedulePeriod: '09:00 - 10:00 AM',
    studentCount: 85,
    createdAt: '2026-09-01T08:00:00.000Z',
  };

  const sampleSession: AttendanceSession = {
    id: 'sess-qa-01',
    groupId: 'grp-qa-01',
    groupName: 'Computer Networks & Security',
    groupCode: 'CS401',
    staffId: 'staff-qa-01',
    date: '2026-09-05',
    period: 'Period 1 (09:00 - 10:00 AM)',
    startTime: '2026-09-05T09:00:00.000Z',
    endTime: '2026-09-05T09:10:00.000Z',
    durationMinutes: 10,
    status: 'closed',
    networkSessionId: 'SAS-CS401-NET01',
  };

  // Generate 85 student records for multi-page stress testing
  const sample85Roster: SessionRosterStudent[] = Array.from({ length: 85 }, (_, i) => {
    const isPresent = i % 3 !== 0;
    const isOverride = i === 10 || i === 25;
    return {
      studentId: `std-${i + 1}`,
      name: `Student LongName ${i + 1} DepartmentOfEngineering`,
      rollNo: `21CS${1000 + i}`,
      email: `student${i + 1}@university.edu`,
      department: 'Computer Science & Engineering',
      status: isOverride ? 'manual_override' : isPresent ? 'present' : 'absent',
      markedAt: isPresent ? `09:0${(i % 9) + 1} AM` : undefined,
      verificationMethod: isOverride
        ? 'manual_override'
        : isPresent
        ? 'wifi_local_network'
        : undefined,
      overrideReason: isOverride ? 'Seat checked by faculty - network glitch' : undefined,
    };
  });

  describe('1. PDF Text Formatting & Color Corruption Fixes', () => {
    const html = pdfExportService.generateSessionHTML({
      group: sampleGroup,
      session: sampleSession,
      roster: sample85Roster,
      staffName: 'Prof. Ada Lovelace',
      staffEmail: 'ada@university.edu',
    });

    test('PDF uses universal print-safe font stack without dynamic fallback fragmentation', () => {
      expect(html).toContain('font-family: Arial, Helvetica, "Nimbus Sans L", "Liberation Sans", sans-serif');
    });

    test('PDF includes print-safe anti-aliasing and geometricPrecision rendering', () => {
      expect(html).toContain('-webkit-font-smoothing: antialiased !important');
      expect(html).toContain('-moz-osx-font-smoothing: grayscale !important');
      expect(html).toContain('text-rendering: geometricPrecision !important');
    });

    test('PDF disables font ligatures to prevent glyph run splitting', () => {
      expect(html).toContain('font-variant-ligatures: none !important');
      expect(html).toContain('font-feature-settings: "liga" 0 !important');
    });

    test('PDF does not contain fractional or negative letter-spacing that causes subpixel color splitting', () => {
      expect(html).not.toContain('letter-spacing: -');
      expect(html).not.toContain('letter-spacing: 0.');
    });

    test('PDF renders all 85 students across multi-page table structure', () => {
      expect(html).toContain('Student LongName 1 DepartmentOfEngineering');
      expect(html).toContain('Student LongName 85 DepartmentOfEngineering');
      expect(html).toContain('21CS1000');
      expect(html).toContain('21CS1084');
      // Repeating header for multi-page print
      expect(html).toContain('thead {');
      expect(html).toContain('display: table-header-group;');
      expect(html).toContain('page-break-inside: avoid;');
    });

    test('PDF uses solid explicit hex colors for all badges and text', () => {
      expect(html).toContain('color: #15803D'); // present text
      expect(html).toContain('color: #B91C1C'); // absent text
      expect(html).toContain('color: #B45309'); // override text
      expect(html).toContain('color: #0F172A'); // body text
      expect(html).toContain('color: #4F46E5'); // brand title
      expect(html).not.toContain('rgba(');
      expect(html).not.toContain('opacity:');
    });
  });

  describe('2. Roster and Session Data Integrity in PDF', () => {
    test('Calculates total, present, absent, and percentage accurately for 85 students', () => {
      const html = pdfExportService.generateSessionHTML({
        group: sampleGroup,
        session: sampleSession,
        roster: sample85Roster,
      });

      const totalStudents = sample85Roster.length;
      const presentCount = sample85Roster.filter((s) => s.status !== 'absent').length;
      const absentCount = sample85Roster.filter((s) => s.status === 'absent').length;
      const rate = Math.round((presentCount / totalStudents) * 100);

      expect(html).toContain(`<div class="stat-val">${totalStudents}</div>`);
      expect(html).toContain(`<div class="stat-val">${presentCount}</div>`);
      expect(html).toContain(`<div class="stat-val">${absentCount}</div>`);
      expect(html).toContain(`<div class="stat-val">${rate}%</div>`);
    });

    test('XSS protection escapes special characters in student names and override reasons', () => {
      const dirtyRoster: SessionRosterStudent[] = [
        {
          studentId: 'st-xss',
          name: '<script>alert("hack")</script> & "Bob"',
          rollNo: '21CS9999',
          email: 'bob@example.com',
          department: 'Computer Science',
          status: 'manual_override',
          overrideReason: '<img src=x onerror=alert(1)> "reason"',
        },
      ];

      const html = pdfExportService.generateSessionHTML({
        group: sampleGroup,
        session: sampleSession,
        roster: dirtyRoster,
      });

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt; &amp; &quot;Bob&quot;');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; &quot;reason&quot;');
    });
  });
});
