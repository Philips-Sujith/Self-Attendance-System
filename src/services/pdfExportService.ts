// ==============================================================================
// SAS — Session Attendance PDF Export Service
// Vector-rendered institutional PDF report generation using expo-print & expo-sharing
// Authoritative Supabase roster data with multi-page printing support
// ==============================================================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { CourseGroup, AttendanceSession } from '../types';
import { SessionRosterStudent } from './sessionService';

export interface PDFExportParams {
  group: CourseGroup;
  session: AttendanceSession;
  roster: SessionRosterStudent[];
  staffName?: string;
  staffEmail?: string;
}

export const pdfExportService = {
  // Generate HTML template for standard A4 printable session report
  generateSessionHTML: (params: PDFExportParams): string => {
    const { group, session, roster, staffName, staffEmail } = params;

    const totalStudents = roster.length;
    const presentCount = roster.filter((s) => s.status !== 'absent').length;
    const absentCount = roster.filter((s) => s.status === 'absent').length;
    const attendancePercentage =
      totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    const formattedStartTime = session.startTime
      ? new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'N/A';
    const formattedEndTime = session.endTime
      ? new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'N/A';

    const tableRows = roster
      .map((student, idx) => {
        const isPresent = student.status === 'present';
        const isAbsent = student.status === 'absent';
        const isOverride = student.status === 'manual_override';
        const isLate = student.status === 'late';

        const statusBadgeClass = isPresent
          ? 'badge-present'
          : isAbsent
          ? 'badge-absent'
          : isOverride
          ? 'badge-override'
          : 'badge-late';

        const statusLabel = isPresent
          ? 'PRESENT'
          : isAbsent
          ? 'ABSENT'
          : isOverride
          ? 'OVERRIDE'
          : 'LATE';

        const markedTimeStr = isAbsent ? '—' : student.markedAt || formattedStartTime;
        const verificationMethodStr = isAbsent
          ? '—'
          : isOverride
          ? 'Manual Override'
          : 'Wi-Fi Local Network';

        const auditNote = student.overrideReason
          ? `<div class="audit-note">Note: "${escapeHTML(student.overrideReason)}"</div>`
          : '';

        return `
          <tr class="${idx % 2 === 0 ? 'even-row' : 'odd-row'}">
            <td class="col-num">${idx + 1}</td>
            <td class="col-name"><strong>${escapeHTML(student.name)}</strong></td>
            <td class="col-roll">${escapeHTML(student.rollNo)}</td>
            <td class="col-status"><span class="badge ${statusBadgeClass}">${statusLabel}</span></td>
            <td class="col-time">${markedTimeStr}</td>
            <td class="col-notes">
              <span class="verification-tag">${verificationMethodStr}</span>
              ${auditNote}
            </td>
          </tr>
        `;
      })
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SAS Attendance Report - ${escapeHTML(group.code)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 12mm 12mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      text-rendering: geometricPrecision !important;
      font-variant-ligatures: none !important;
      font-feature-settings: "liga" 0 !important;
    }
    body {
      font-family: Arial, Helvetica, "Nimbus Sans L", "Liberation Sans", sans-serif;
      color: #0F172A;
      background-color: #FFFFFF;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.4;
    }
    .header-container {
      border-bottom: 2px solid #4F46E5;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .brand-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .brand-title {
      font-size: 19px;
      font-weight: 700;
      color: #4F46E5;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 10px;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      margin: 3px 0 0 0;
    }
    .doc-type {
      background-color: #EEF2FF;
      color: #4338CA;
      padding: 4px 10px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 11px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 12px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 9px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .meta-value {
      font-size: 11.5px;
      font-weight: 700;
      color: #0F172A;
    }
    .stats-card-row {
      display: flex;
      gap: 10px;
      margin-bottom: 12px;
    }
    .stat-pill {
      flex: 1;
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 8px 10px;
      text-align: center;
    }
    .stat-pill.success {
      background-color: #F0FDF4;
      border-color: #BBF7D0;
    }
    .stat-pill.danger {
      background-color: #FEF2F2;
      border-color: #FECACA;
    }
    .stat-pill.primary {
      background-color: #EEF2FF;
      border-color: #C7D2FE;
    }
    .stat-val {
      font-size: 18px;
      font-weight: 700;
      color: #0F172A;
      margin: 0;
    }
    .stat-pill.success .stat-val { color: #16A34A; }
    .stat-pill.danger .stat-val { color: #DC2626; }
    .stat-pill.primary .stat-val { color: #4F46E5; }
    .stat-lbl {
      font-size: 9px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      margin-top: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
    }
    th {
      background-color: #F1F5F9;
      color: #1E293B;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 7px 8px;
      border-bottom: 1.5px solid #CBD5E1;
      text-align: left;
    }
    td {
      padding: 6px 8px;
      border-bottom: 1px solid #E2E8F0;
      font-size: 10.5px;
      vertical-align: middle;
      color: #0F172A;
    }
    .even-row {
      background-color: #FFFFFF;
    }
    .odd-row {
      background-color: #F8FAFC;
    }
    .col-num { width: 28px; text-align: center; color: #475569; font-weight: 700; }
    .col-name { min-width: 130px; color: #0F172A; font-weight: 700; }
    .col-roll { width: 95px; color: #1E293B; font-family: "Courier New", Courier, monospace; font-size: 11px; font-weight: 600; }
    .col-status { width: 80px; }
    .col-time { width: 75px; color: #334155; }
    .col-notes { min-width: 120px; color: #334155; }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-present {
      background-color: #DCFCE7;
      color: #15803D;
      border: 1px solid #86EFAC;
    }
    .badge-absent {
      background-color: #FEE2E2;
      color: #B91C1C;
      border: 1px solid #FCA5A5;
    }
    .badge-override {
      background-color: #FEF3C7;
      color: #B45309;
      border: 1px solid #FCD34D;
    }
    .badge-late {
      background-color: #FFEDD5;
      color: #C2410C;
      border: 1px solid #FDBA74;
    }
    .verification-tag {
      font-size: 9.5px;
      color: #475569;
    }
    .audit-note {
      font-size: 9px;
      color: #B45309;
      font-style: italic;
      margin-top: 1px;
    }
    .footer {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      color: #64748B;
      font-size: 8.5px;
    }
  </style>
</head>
<body>
  <div class="header-container">
    <div class="brand-row">
      <div>
        <h1 class="brand-title">SAS — Self Attendance System</h1>
        <p class="brand-subtitle">Official Course Session Attendance Record</p>
      </div>
      <div class="doc-type">OFFICIAL AUDIT REPORT</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item">
      <span class="meta-label">Course Title</span>
      <span class="meta-value">${escapeHTML(group.name)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Course Code & Sec</span>
      <span class="meta-value">${escapeHTML(group.code)} (${escapeHTML(group.section)})</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Session Date</span>
      <span class="meta-value">${escapeHTML(session.date)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Class Period</span>
      <span class="meta-value">${escapeHTML(session.period)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Session Time Window</span>
      <span class="meta-value">${formattedStartTime} – ${formattedEndTime}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Duration</span>
      <span class="meta-value">${session.durationMinutes} Minutes</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Faculty Instructor</span>
      <span class="meta-value">${escapeHTML(staffName || group.staffName || 'Instructor')}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Network Session ID</span>
      <span class="meta-value">${escapeHTML(session.networkSessionId || 'SAS-NET')}</span>
    </div>
  </div>

  <div class="stats-card-row">
    <div class="stat-pill">
      <div class="stat-val">${totalStudents}</div>
      <div class="stat-lbl">Total Enrolled</div>
    </div>
    <div class="stat-pill success">
      <div class="stat-val">${presentCount}</div>
      <div class="stat-lbl">Present (Verified)</div>
    </div>
    <div class="stat-pill danger">
      <div class="stat-val">${absentCount}</div>
      <div class="stat-lbl">Absent</div>
    </div>
    <div class="stat-pill primary">
      <div class="stat-val">${attendancePercentage}%</div>
      <div class="stat-lbl">Attendance Rate</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="col-num">#</th>
        <th class="col-name">Student Name</th>
        <th class="col-roll">Roll Number</th>
        <th class="col-status">Status</th>
        <th class="col-time">Time</th>
        <th class="col-notes">Verification / Audit Notes</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="footer">
    <span>Generated via SAS Attendance System • Database Timestamp: ${new Date().toLocaleString()}</span>
    <span>Instructor: ${escapeHTML(staffEmail || staffName || 'Faculty')} • Authoritative Record</span>
  </div>
</body>
</html>
`;
  },

  // Generate PDF file and invoke native save/share/print sheet
  generateAndShareSessionPDF: async (
    params: PDFExportParams
  ): Promise<{ success: boolean; uri?: string; error?: string }> => {
    try {
      const html = pdfExportService.generateSessionHTML(params);

      // Generate PDF file via expo-print
      const printResult = await Print.printToFileAsync({
        html,
        base64: false,
      });

      if (!printResult || !printResult.uri) {
        throw new Error('Failed to generate PDF document.');
      }

      const cleanCode = (params.group.code || 'COURSE').replace(/[^a-zA-Z0-9]/g, '_');
      const cleanDate = (params.session.date || 'DATE').replace(/[^a-zA-Z0-9]/g, '_');
      const cleanPeriod = (params.session.period || 'P1').replace(/[^a-zA-Z0-9]/g, '_');
      const targetFileName = `SAS_${cleanCode}_${cleanDate}_${cleanPeriod}_Attendance.pdf`;

      let finalUri = printResult.uri;

      // Rename / copy to clean filename if file-system is available
      try {
        if (FileSystem.documentDirectory) {
          const destinationPath = `${FileSystem.documentDirectory}${targetFileName}`;
          await FileSystem.copyAsync({
            from: printResult.uri,
            to: destinationPath,
          });
          finalUri = destinationPath;
        }
      } catch (copyErr) {
        console.warn('PDF rename fallback to temp uri:', copyErr);
      }

      // Share or open native viewer
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(finalUri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Share ${targetFileName}`,
        });
      }

      return {
        success: true,
        uri: finalUri,
      };
    } catch (err: any) {
      console.error('Error generating attendance PDF:', err);
      return {
        success: false,
        error: err.message || 'Failed to export attendance PDF.',
      };
    }
  },
};

// Safe HTML entity escaping helper
function escapeHTML(str?: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
