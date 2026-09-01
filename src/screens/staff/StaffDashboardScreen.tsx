import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { CourseGroup } from '../../types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StaffStackParamList } from '../../types/navigation';

const MOCK_GROUPS: CourseGroup[] = [
  {
    id: 'grp-001',
    name: 'Digital System Design (DSD)',
    code: 'CS302',
    section: 'Section A',
    staffId: 'staff-001',
    staffName: 'Dr. Sujith Philips',
    joinCode: 'DSD-A24',
    scheduleDay: 'Monday, Wednesday, Friday',
    schedulePeriod: '09:00 - 10:00 AM',
    studentCount: 85,
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
    scheduleDay: 'Tuesday, Thursday',
    schedulePeriod: '11:15 - 12:45 PM',
    studentCount: 78,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'grp-003',
    name: 'Distributed Systems & Cloud',
    code: 'CS605',
    section: 'Section C',
    staffId: 'staff-001',
    staffName: 'Dr. Sujith Philips',
    joinCode: 'DSC-C12',
    scheduleDay: 'Friday',
    schedulePeriod: '02:00 - 04:00 PM',
    studentCount: 64,
    createdAt: new Date().toISOString(),
  },
];

export const StaffDashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const [groups, setGroups] = useState<CourseGroup[]>(MOCK_GROUPS);

  const handleOpenGroup = (group: CourseGroup) => {
    navigation.navigate('StaffGroupDetail', { group });
  };

  const handleStartQuickSession = (group: CourseGroup) => {
    navigation.navigate('StaffSessionLive', {
      session: {
        id: 'sess-' + Date.now(),
        groupId: group.id,
        groupName: group.name,
        groupCode: group.code,
        staffId: user?.id || 'staff-001',
        date: new Date().toISOString().split('T')[0],
        period: group.schedulePeriod,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        durationMinutes: 5,
        status: 'active',
        networkSessionId: `SAS-${group.code}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        presentCount: 0,
        totalStudents: group.studentCount || 85,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Staff Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.staffName}>{user?.name || 'Dr. Sujith Philips'}</Text>
            <Text style={styles.departmentText}>
              {user?.department || 'Department of Computer Science'} • {user?.staffId || 'CSE-FAC-104'}
            </Text>
          </View>
          <View style={styles.avatarPill}>
            <Ionicons name="school" size={24} color={Colors.primaryLight} />
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{groups.length}</Text>
            <Text style={styles.statLabel}>Course Groups</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>
              {groups.reduce((acc, g) => acc + (g.studentCount || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Total Students</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statNumber, { color: Colors.success }]}>94.2%</Text>
            <Text style={styles.statLabel}>Avg. Attendance</Text>
          </Card>
        </View>

        {/* Course Groups Section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>My Course Groups</Text>
            <Text style={styles.sectionSubtitle}>Manage rosters, schedule & sessions</Text>
          </View>
          <Button
            title="+ New Group"
            size="sm"
            variant="outline"
            onPress={() => {
              /* In Stage 3: Full modal */
            }}
          />
        </View>

        {/* Course Cards List */}
        <View style={styles.groupsList}>
          {groups.map((item) => (
            <Card key={item.id} variant="elevated" style={styles.courseCard}>
              <View style={styles.courseCardHeader}>
                <View style={styles.courseInfo}>
                  <View style={styles.codeRow}>
                    <Badge label={item.code} variant="primary" size="sm" />
                    <Badge label={item.section} variant="neutral" size="sm" />
                  </View>
                  <Text style={styles.courseName}>{item.name}</Text>
                </View>

                <View style={styles.joinCodeBox}>
                  <Text style={styles.joinCodeLabel}>JOIN CODE</Text>
                  <Text style={styles.joinCodeText}>{item.joinCode}</Text>
                </View>
              </View>

              {/* Schedule and Roster info */}
              <View style={styles.scheduleRow}>
                <View style={styles.scheduleItem}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.scheduleText}>{item.scheduleDay}</Text>
                </View>
                <View style={styles.scheduleItem}>
                  <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.scheduleText}>{item.schedulePeriod}</Text>
                </View>
                <View style={styles.scheduleItem}>
                  <Ionicons name="people-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.scheduleText}>{item.studentCount} Students</Text>
                </View>
              </View>

              {/* Card Action Buttons */}
              <View style={styles.cardActionsRow}>
                <Button
                  title="View Roster"
                  variant="ghost"
                  size="sm"
                  iconName="list-outline"
                  onPress={() => handleOpenGroup(item)}
                  style={styles.rosterBtn}
                />
                <Button
                  title="Start Session"
                  variant="primary"
                  size="sm"
                  iconName="radio-outline"
                  onPress={() => handleStartQuickSession(item)}
                  style={styles.sessionBtn}
                />
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  greeting: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  staffName: {
    ...Typography.h1,
    fontSize: 24,
    marginTop: 2,
  },
  departmentText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  avatarPill: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryLight + '44',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  statNumber: {
    ...Typography.h2,
    color: Colors.primaryLight,
  },
  statLabel: {
    ...Typography.caption,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h2,
    fontSize: 18,
  },
  sectionSubtitle: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  groupsList: {
    gap: Spacing.md,
  },
  courseCard: {
    padding: Spacing.md,
  },
  courseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  courseInfo: {
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
    fontSize: 16,
    color: Colors.text,
  },
  joinCodeBox: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
  },
  joinCodeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  joinCodeText: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.primaryLight,
    letterSpacing: 1,
  },
  scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginVertical: Spacing.sm,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  rosterBtn: {
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  sessionBtn: {
    flex: 1,
  },
});
