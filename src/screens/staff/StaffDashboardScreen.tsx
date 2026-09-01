import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { CourseGroup, AttendanceSession } from '../../types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StaffStackParamList } from '../../types/navigation';
import { groupService } from '../../services/groupService';
import { StaffCreateGroupModal } from './StaffCreateGroupModal';
import { StaffStartSessionModal } from './StaffStartSessionModal';

export const StaffDashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const [groups, setGroups] = useState<CourseGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedGroupForSession, setSelectedGroupForSession] = useState<CourseGroup | null>(null);

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    const data = await groupService.getStaffCourseGroups(user.id);
    setGroups(data);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [user]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchGroups();
  };

  const handleGroupCreated = (newGroup: CourseGroup) => {
    setGroups((prev) => [newGroup, ...prev]);
  };

  const handleOpenGroup = (group: CourseGroup) => {
    navigation.navigate('StaffGroupDetail', { group });
  };

  const handleStartSession = (group: CourseGroup) => {
    setSelectedGroupForSession(group);
  };

  const handleSessionStarted = (session: AttendanceSession) => {
    navigation.navigate('StaffSessionLive', { session });
  };

  const totalStudents = groups.reduce((acc, g) => acc + (g.studentCount || 0), 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primaryLight}
          />
        }
      >
        {/* Top Staff Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.staffName}>{user?.name || 'Faculty Member'}</Text>
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
            <Text style={styles.statNumber}>{totalStudents}</Text>
            <Text style={styles.statLabel}>Total Students</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statNumber, { color: Colors.success }]}>94.2%</Text>
            <Text style={styles.statLabel}>Avg. Attendance</Text>
          </Card>
        </View>

        {/* Course Groups Section Header */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>My Course Groups</Text>
            <Text style={styles.sectionSubtitle}>Manage rosters, schedule & sessions</Text>
          </View>
          <Button
            title="+ New Group"
            size="sm"
            variant="outline"
            iconName="add"
            onPress={() => setCreateModalVisible(true)}
          />
        </View>

        {/* Course Cards List */}
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.primaryLight} />
            <Text style={styles.loadingText}>Loading course groups…</Text>
          </View>
        ) : groups.length === 0 ? (
          <Card variant="bordered" style={styles.emptyCard}>
            <Ionicons name="folder-open-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Course Groups Yet</Text>
            <Text style={styles.emptyDesc}>
              Create your first course group to generate a join code and enroll students.
            </Text>
            <Button
              title="Create First Course Group"
              variant="primary"
              size="md"
              iconName="add-circle-outline"
              onPress={() => setCreateModalVisible(true)}
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        ) : (
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
                    <Text style={styles.scheduleText}>{item.studentCount || 0} Students</Text>
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
                    onPress={() => handleStartSession(item)}
                    style={styles.sessionBtn}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Course Group Creation Modal */}
      {user && (
        <StaffCreateGroupModal
          visible={createModalVisible}
          staffId={user.id}
          staffName={user.name}
          onClose={() => setCreateModalVisible(false)}
          onGroupCreated={handleGroupCreated}
        />
      )}

      {/* Start Session Modal */}
      {user && selectedGroupForSession && (
        <StaffStartSessionModal
          visible={!!selectedGroupForSession}
          group={selectedGroupForSession}
          staffId={user.id}
          onClose={() => setSelectedGroupForSession(null)}
          onSessionStarted={handleSessionStarted}
        />
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
