import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
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
import { groupService } from '../../services/groupService';
import { sessionService } from '../../services/sessionService';

export const StudentDashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
  const [courses, setCourses] = useState<CourseGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    const [coursesData, sessionData] = await Promise.all([
      groupService.getStudentCourseGroups(user.id),
      sessionService.getActiveSessionForStudent(user.id),
    ]);
    setCourses(coursesData);
    setActiveSession(sessionData);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
  };

  const handleMarkAttendance = () => {
    if (activeSession) {
      navigation.navigate('StudentMarkAttendance', { session: activeSession });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.secondary}
          />
        }
      >
        {/* Student Profile Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
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
              <Text style={styles.bannerTimer}>~{activeSession.durationMinutes} mins</Text>
            </View>

            <Text style={styles.bannerCourseTitle}>
              {activeSession.groupName || activeSession.groupCode}
            </Text>
            <Text style={styles.bannerSubtitle}>
              Class Period: {activeSession.period} • WiFi Proximity Check Required
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
              <Text style={styles.summaryPercent}>92.8%</Text>
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
            <Text style={styles.sectionSubtitle}>Subjects you've joined with join codes</Text>
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
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.secondary} />
            <Text style={styles.loadingText}>Loading enrolled courses…</Text>
          </View>
        ) : courses.length === 0 ? (
          <Card variant="bordered" style={styles.emptyCard}>
            <Ionicons name="school-outline" size={44} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Courses Enrolled</Text>
            <Text style={styles.emptyDesc}>
              Ask your faculty member for the 6-character course join code and tap "+ Join Course".
            </Text>
            <Button
              title="Join a Course Now"
              variant="secondary"
              size="md"
              iconName="key-outline"
              onPress={() => navigation.navigate('StudentJoinGroup')}
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        ) : (
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
                    <Text style={styles.instructorText}>Instructor: {course.staffName || 'Faculty'}</Text>
                  </View>

                  <View style={styles.percentBox}>
                    <Text style={[styles.percentText, { color: Colors.success }]}>
                      95%
                    </Text>
                    <Text style={styles.classesAttended}>Present: 19/20</Text>
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
        )}
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
  loaderContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    marginTop: Spacing.md,
  },
  emptyTitle: {
    ...Typography.h3,
    marginTop: Spacing.sm,
  },
  emptyDesc: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
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
