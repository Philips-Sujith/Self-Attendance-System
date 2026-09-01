import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StaffStackParamList } from '../../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { groupService, RosterMember } from '../../services/groupService';
import { sessionService, SessionRosterStudent } from '../../services/sessionService';
import { csvExportService } from '../../services/csvExportService';
import { AttendanceSession, CourseGroup } from '../../types';

type StaffReportsScreenProps = NativeStackScreenProps<StaffStackParamList, 'StaffSessionReport'>;

export const StaffReportsScreen: React.FC<StaffReportsScreenProps> = ({ route }) => {
  const { session } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [isExportingMaster, setIsExportingMaster] = useState(false);
  const [isExportingSession, setIsExportingSession] = useState(false);
  const [roster, setRoster] = useState<SessionRosterStudent[]>([]);
  const [allStudents, setAllStudents] = useState<RosterMember[]>([]);
  const [pastSessions, setPastSessions] = useState<AttendanceSession[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [sessionData, fullRoster, sessionsList] = await Promise.all([
      sessionService.getSessionRosterAndRecords(session.id, session.groupId),
      groupService.getCourseGroupRoster(session.groupId),
      sessionService.getCourseSessions(session.groupId),
    ]);
    setRoster(sessionData);
    setAllStudents(fullRoster);
    setPastSessions(sessionsList.length > 0 ? sessionsList : [session]);
    setIsLoading(false);
  }, [session]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Master CSV Export
  const handleExportMasterCSV = async () => {
    setIsExportingMaster(true);
    const groupData: CourseGroup = {
      id: session.groupId,
      name: session.groupName || 'Course',
      code: session.groupCode || 'CLASS',
      section: 'Section',
      staffId: session.staffId,
      joinCode: session.groupCode || 'JOIN',
      scheduleDay: 'Class Schedule',
      schedulePeriod: session.period,
      studentCount: allStudents.length,
      createdAt: new Date().toISOString(),
    };

    const csvContent = csvExportService.generateCourseMasterCSV(
      groupData,
      allStudents,
      Math.max(pastSessions.length, 1)
    );

    const fileName = `${groupData.code}_Semester_Master_Attendance_${new Date().toISOString().split('T')[0]}.csv`;
    const result = await csvExportService.exportAndShareCSV(fileName, csvContent);
    setIsExportingMaster(false);

    if (result.success) {
      Alert.alert('CSV Ready', `Generated & Shared ${fileName}`);
    } else {
      Alert.alert('Export Failed', result.error || 'Could not export CSV file.');
    }
  };

  // Handle Single Session CSV Export
  const handleExportSessionCSV = async (targetSession: AttendanceSession) => {
    setIsExportingSession(true);
    const groupData: CourseGroup = {
      id: session.groupId,
      name: session.groupName || 'Course',
      code: session.groupCode || 'CLASS',
      section: 'Section',
      staffId: session.staffId,
      joinCode: session.groupCode || 'JOIN',
      scheduleDay: 'Class Schedule',
      schedulePeriod: targetSession.period,
      studentCount: roster.length,
      createdAt: new Date().toISOString(),
    };

    // Load roster for targeted session
    const targetRoster =
      targetSession.id === session.id
        ? roster
        : await sessionService.getSessionRosterAndRecords(targetSession.id, session.groupId);

    const csvContent = csvExportService.generateSessionCSV(groupData, targetSession, targetRoster);
    const fileName = `${groupData.code}_Session_${targetSession.date}_Attendance.csv`;
    const result = await csvExportService.exportAndShareCSV(fileName, csvContent);
    setIsExportingSession(false);

    if (result.success) {
      Alert.alert('Session CSV Exported', `Generated ${fileName}`);
    } else {
      Alert.alert('Export Failed', result.error || 'Could not export session CSV.');
    }
  };

  const presentCount = roster.filter((r) => r.status !== 'absent').length;
  const absentCount = roster.filter((r) => r.status === 'absent').length;
  const attendanceRate = roster.length > 0 ? Math.round((presentCount / roster.length) * 100) : 0;
  const defaulters = allStudents.filter((s) => (s.attendancePercentage || 90) < 75);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title={`${session.groupCode || 'Course'} Reports`}
        subtitle="Attendance Analytics & CSV Export"
        showBack
      />
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Colors.primaryLight} />
          <Text style={styles.loadingText}>Loading attendance analytics…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {/* Course Performance Summary Card */}
          <Card variant="glow" style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.courseCodeBadge}>{session.groupCode || 'COURSE'}</Text>
                <Text style={styles.courseTitle}>{session.groupName || 'Course Attendance'}</Text>
              </View>
              <Badge label="Active Semester" variant="secondary" />
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Total Sessions</Text>
                <Text style={styles.metricVal}>{pastSessions.length}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Enrolled Students</Text>
                <Text style={[styles.metricVal, { color: Colors.primaryLight }]}>
                  {allStudents.length}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Defaulters (&lt;75%)</Text>
                <Text style={[styles.metricVal, { color: defaulters.length > 0 ? Colors.warning : Colors.success }]}>
                  {defaulters.length}
                </Text>
              </View>
            </View>

            {/* Master Export Button */}
            <Button
              title="Export Full Course Semester CSV"
              variant="primary"
              size="lg"
              iconName="document-text"
              loading={isExportingMaster}
              onPress={handleExportMasterCSV}
              style={{ marginTop: Spacing.md }}
            />
          </Card>

          {/* Selected Session Snapshot */}
          <Card style={styles.sessionCard}>
            <View style={styles.sessionCardHeader}>
              <View>
                <Text style={styles.sessionCardTitle}>Selected Session</Text>
                <Text style={styles.sessionCardSub}>
                  {session.date} • {session.period}
                </Text>
              </View>
              <Badge
                label={`${attendanceRate}% Present`}
                variant={attendanceRate >= 75 ? 'success' : 'warning'}
              />
            </View>

            <View style={styles.sessionStatsRow}>
              <View style={styles.statPill}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.statPillText}>Present: {presentCount}</Text>
              </View>
              <View style={styles.statPill}>
                <Ionicons name="close-circle" size={16} color={Colors.danger} />
                <Text style={styles.statPillText}>Absent: {absentCount}</Text>
              </View>
              <View style={styles.statPill}>
                <Ionicons name="people" size={16} color={Colors.textSecondary} />
                <Text style={styles.statPillText}>Total: {roster.length}</Text>
              </View>
            </View>

            <Button
              title="Export This Session CSV"
              variant="outline"
              size="sm"
              iconName="download-outline"
              loading={isExportingSession}
              onPress={() => handleExportSessionCSV(session)}
              style={{ marginTop: Spacing.md }}
            />
          </Card>

          {/* Past Sessions Archive */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Attendance Sessions History ({pastSessions.length})</Text>
            <Text style={styles.sectionSubtitle}>Tap to download individual session CSV spreadsheet</Text>
          </View>

          {pastSessions.map((sess, idx) => (
            <Card key={sess.id || idx} style={styles.pastSessionItem}>
              <View style={styles.pastSessionRow}>
                <View style={styles.pastSessionDateBox}>
                  <Ionicons name="calendar-outline" size={20} color={Colors.primaryLight} />
                  <View>
                    <Text style={styles.pastDateText}>{sess.date}</Text>
                    <Text style={styles.pastPeriodText}>{sess.period}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.exportBtnSmall}
                  onPress={() => handleExportSessionCSV(sess)}
                >
                  <Ionicons name="cloud-download-outline" size={18} color={Colors.secondary} />
                  <Text style={styles.exportBtnSmallText}>CSV</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    gap: Spacing.sm,
  },
  loadingText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  summaryCard: {
    padding: Spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  courseCodeBadge: {
    ...Typography.captionBold,
    color: Colors.secondary,
    letterSpacing: 1,
  },
  courseTitle: {
    ...Typography.h1,
    fontSize: 20,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    textAlign: 'center',
  },
  metricVal: {
    ...Typography.h2,
    fontSize: 20,
    marginTop: 4,
  },
  sessionCard: {
    padding: Spacing.md,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionCardTitle: {
    ...Typography.bodyBold,
    fontSize: 16,
  },
  sessionCardSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sessionStatsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  statPillText: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.text,
  },
  sectionHeader: {
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.h2,
    fontSize: 16,
  },
  sectionSubtitle: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  pastSessionItem: {
    padding: Spacing.md,
  },
  pastSessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pastSessionDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pastDateText: {
    ...Typography.bodyBold,
    fontSize: 14,
  },
  pastPeriodText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  exportBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.secondary + '44',
  },
  exportBtnSmallText: {
    ...Typography.captionBold,
    color: Colors.secondary,
    fontSize: 12,
  },
});
