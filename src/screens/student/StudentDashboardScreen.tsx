import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { CourseGroup, AttendanceSession } from '../../types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StudentStackParamList } from '../../types/navigation';

interface EnrolledCourseItem extends CourseGroup {
  totalClasses: number;
  attendedClasses: number;
  percentage: number;
}

const MOCK_ENROLLED_COURSES: EnrolledCourseItem[] = [
  {
    id: 'grp-001',
    name: 'Digital System Design',
    code: 'CS302',
    section: 'Section A',
    staffId: 'staff-001',
    staffName: 'Dr. Sujith Philips',
    joinCode: 'DSD-A24',
    scheduleDay: 'Mon, Wed, Fri',
    schedulePeriod: '09:00 - 10:00 AM',
    totalClasses: 25,
    attendedClasses: 24,
    percentage: 96,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'grp-002',
    name: 'Operating Systems & Concurrency',
    code: 'CS401',
    section: 'Section B',
    staffId: 'staff-001',
    staffName: 'Dr. Sujith Philips',
    joinCode: 'OS-B89',
    scheduleDay: 'Tue, Thu',
    schedulePeriod: '11:15 - 12:45 PM',
    totalClasses: 22,
    attendedClasses: 19,
    percentage: 86.4,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'grp-003',
    name: 'Distributed Systems & Cloud',
    code: 'CS605',
    section: 'Section C',
    staffId: 'staff-002',
    staffName: 'Prof. Alan Turing',
    joinCode: 'DSC-C12',
    scheduleDay: 'Friday',
    schedulePeriod: '02:00 - 04:00 PM',
    totalClasses: 18,
    attendedClasses: 17,
    percentage: 94.4,
    createdAt: new Date().toISOString(),
  },
];

// Active mock session that student can mark
const MOCK_ACTIVE_SESSION: AttendanceSession = {
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
};

export const StudentDashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
  const [courses] = useState<EnrolledCourseItem[]>(MOCK_ENROLLED_COURSES);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(MOCK_ACTIVE_SESSION);

  const overallAvg = Math.round(
    courses.reduce((acc, c) => acc + c.percentage, 0) / courses.length
  );

  const handleMarkAttendance = () => {
    if (activeSession) {
      navigation.navigate('StudentMarkAttendance', { session: activeSession });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Student Profile Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Student Dashboard</Text>
            <Text style={styles.studentName}>{user?.name || 'Alex Johnson'}</Text>
            <Text style={styles.subDetail}>
              {user?.rollNo || '21CS1085'} • {user?.classSection || 'CSE Sec B'}
            </Text>
          </View>
          <View style={styles.avatarPill}>
            <Ionicons name="person" size={22} color={Colors.secondary} />
          </View>
        </View>

        {/* ACTIVE ATTENDANCE SESSION BANNER */}
        {activeSession && (
          <Card variant="glow" style={styles.activeSessionBanner}>
            <View style={styles.bannerHeader}>
              <Badge label="ATTENDANCE OPEN NOW" variant="warning" dot />
              <Text style={styles.bannerTimer}>~4 mins left</Text>
            </View>

            <Text style={styles.bannerCourseTitle}>{activeSession.groupName}</Text>
            <Text style={styles.bannerSubtitle}>
              Class Period: {activeSession.period} • Proximity WiFi Check Required
            </Text>

            <Button
              title="Open Session & Mark Attendance"
              variant="primary"
              size="md"
              iconName="finger-print"
              onPress={handleMarkAttendance}
              style={styles.markBtn}
            />
          </Card>
        )}

        {/* Attendance Summary Stat */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>OVERALL ATTENDANCE</Text>
              <Text style={styles.summaryPercent}>{overallAvg}%</Text>
              <Text style={styles.summarySub}>Across {courses.length} enrolled subjects</Text>
            </View>
            <View style={styles.summaryIconBox}>
              <Ionicons name="checkmark-done-circle" size={44} color={Colors.success} />
            </View>
          </View>
        </Card>

        {/* Enrolled Courses Header */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Enrolled Courses</Text>
            <Text style={styles.sectionSubtitle}>View attendance per subject</Text>
          </View>
          <Button
            title="+ Join Course"
            size="sm"
            variant="secondary"
            iconName="add"
            onPress={() => navigation.navigate('StudentJoinGroup')}
          />
        </View>

        {/* Courses List */}
        <View style={styles.coursesList}>
          {courses.map((course) => (
            <Card key={course.id} style={styles.courseCard}>
              <View style={styles.courseHeader}>
                <View style={styles.courseTitleCol}>
                  <View style={styles.codeRow}>
                    <Badge label={course.code} variant="secondary" size="sm" />
                    <Badge label={course.section} variant="neutral" size="sm" />
                  </View>
                  <Text style={styles.courseName}>{course.name}</Text>
                  <Text style={styles.instructorText}>Instructor: {course.staffName}</Text>
                </View>

                <View style={styles.percentBox}>
                  <Text
                    style={[
                      styles.percentText,
                      course.percentage >= 85
                        ? { color: Colors.success }
                        : course.percentage >= 75
                        ? { color: Colors.warning }
                        : { color: Colors.danger },
                    ]}
                  >
                    {course.percentage}%
                  </Text>
                  <Text style={styles.classesAttended}>
                    {course.attendedClasses}/{course.totalClasses} classes
                  </Text>
                </View>
              </View>

              <View style={styles.scheduleRow}>
                <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.scheduleText}>
                  {course.scheduleDay} ({course.schedulePeriod})
                </Text>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  greeting: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  studentName: {
    ...Typography.h1,
    fontSize: 22,
    marginTop: 2,
  },
  subDetail: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  avatarPill: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.secondary + '44',
  },
  activeSessionBanner: {
    padding: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.primaryLight,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  bannerTimer: {
    ...Typography.captionBold,
    color: Colors.warning,
  },
  bannerCourseTitle: {
    ...Typography.h2,
    fontSize: 18,
    marginTop: Spacing.xs,
  },
  bannerSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  markBtn: {
    marginTop: Spacing.md,
  },
  summaryCard: {
    padding: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    ...Typography.captionBold,
    letterSpacing: 0.5,
    fontSize: 11,
    color: Colors.textMuted,
  },
  summaryPercent: {
    ...Typography.h1,
    fontSize: 32,
    color: Colors.success,
    marginVertical: 2,
  },
  summarySub: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  summaryIconBox: {
    opacity: 0.9,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.h2,
    fontSize: 18,
  },
  sectionSubtitle: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  coursesList: {
    gap: Spacing.sm,
  },
  courseCard: {
    padding: Spacing.md,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  courseTitleCol: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  codeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  courseName: {
    ...Typography.bodyBold,
    fontSize: 15,
  },
  instructorText: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  percentBox: {
    alignItems: 'flex-end',
  },
  percentText: {
    ...Typography.h2,
    fontSize: 20,
  },
  classesAttended: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  scheduleText: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
