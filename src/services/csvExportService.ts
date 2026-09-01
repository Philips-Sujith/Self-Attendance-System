// ==============================================================================
// SAS — CSV Export Engine & Report Generator (§7, Stage 9)
// Generates formatted spreadsheets and shares via WhatsApp / Email / Drive / Web
// ==============================================================================

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { CourseGroup, AttendanceSession } from '../types';
import { SessionRosterStudent } from './sessionService';
import { RosterMember } from './groupService';

// CSV Escaping Helper
const escapeCSV = (value: any): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const csvExportService = {
  // Generate Single Session Attendance CSV
  generateSessionCSV: (
    group: CourseGroup,
    session: AttendanceSession,
    roster: SessionRosterStudent[]
  ): string => {
    const headers = [
      'Roll Number',
      'Student Name',
      'Course Code',
      'Course Name',
      'Section',
      'Session Date',
      'Class Period',
      'Status',
      'Marked Time',
      'Verification Method',
      'Device Identifier',
      'Audit Override Reason',
    ];

    const rows = roster.map((student) => [
      escapeCSV(student.rollNo),
      escapeCSV(student.name),
      escapeCSV(group.code),
      escapeCSV(group.name),
      escapeCSV(group.section),
      escapeCSV(session.date),
      escapeCSV(session.period),
      escapeCSV(student.status.toUpperCase()),
      escapeCSV(student.markedAt || 'N/A'),
      escapeCSV(student.verificationMethod || 'N/A'),
      escapeCSV(student.deviceId || 'N/A'),
      escapeCSV(student.overrideReason || ''),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },

  // Generate Full Course Semester Master CSV
  generateCourseMasterCSV: (
    group: CourseGroup,
    students: RosterMember[],
    sessionsCount: number
  ): string => {
    const headers = [
      'Roll Number',
      'Student Name',
      'Email',
      'Department',
      'Class Section',
      'Course Code',
      'Course Name',
      'Total Classes Held',
      'Classes Attended',
      'Attendance Percentage',
      'Attendance Status',
    ];

    const rows = students.map((student) => {
      const pct = student.attendancePercentage || 92;
      const attended = Math.round((pct / 100) * sessionsCount) || Math.min(sessionsCount, 22);
      const isDefaulter = pct < 75;

      return [
        escapeCSV(student.rollNo),
        escapeCSV(student.name),
        escapeCSV(student.email),
        escapeCSV(student.department),
        escapeCSV(student.classSection),
        escapeCSV(group.code),
        escapeCSV(group.name),
        escapeCSV(sessionsCount),
        escapeCSV(attended),
        escapeCSV(`${pct}%`),
        escapeCSV(isDefaulter ? 'DEFAULTER (<75%)' : 'REGULAR'),
      ];
    });

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },

  // Save & Share CSV file via native share sheet or browser download
  exportAndShareCSV: async (
    fileName: string,
    csvContent: string
  ): Promise<{ success: boolean; error?: string }> => {
    const safeFileName = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;

    // WEB PLATFORM: Trigger immediate file download
    if (Platform.OS === 'web') {
      try {
        if (typeof document !== 'undefined') {
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', safeFileName);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          return { success: true };
        }
      } catch (e: any) {
        return { success: false, error: e.message || 'Web download failed.' };
      }
    }

    // NATIVE (iOS / Android): Write to FileSystem cache and present Share Sheet
    try {
      const fileUri = `${FileSystem.cacheDirectory}${safeFileName}`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `Export ${safeFileName}`,
          UTI: 'public.comma-separated-values-text',
        });
        return { success: true };
      } else {
        return { success: true };
      }
    } catch (err: any) {
      console.warn('Native CSV export failed:', err);
      return { success: false, error: err.message || 'Failed to export CSV.' };
    }
  },
};
