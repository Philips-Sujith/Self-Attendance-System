import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StaffStackParamList } from '../../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { AttendanceStatus } from '../../types';
import { sessionService, SessionRosterStudent } from '../../services/sessionService';
import { networkProximityService } from '../../services/networkProximityService';

type StaffSessionScreenProps = NativeStackScreenProps<StaffStackParamList, 'StaffSessionLive'>;

type FilterTab = 'all' | 'present' | 'absent';

export const StaffSessionScreen: React.FC<StaffSessionScreenProps> = ({ route, navigation }) => {
  const { session } = route.params;

  const calculateInitialSeconds = () => {
    if (session.status !== 'active') return 0;
    const diff = Math.floor((new Date(session.endTime).getTime() - Date.now()) / 1000);
    return Math.max(0, diff > 0 ? diff : session.durationMinutes * 60);
  };

  const [secondsRemaining, setSecondsRemaining] = useState<number>(calculateInitialSeconds);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(session.status === 'active');
  const [roster, setRoster] = useState<SessionRosterStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [isAdvertisingmDNS, setIsAdvertisingmDNS] = useState(false);

  // Manual Override Modal state
  const [selectedStudent, setSelectedStudent] = useState<SessionRosterStudent | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [targetStatus, setTargetStatus] = useState<AttendanceStatus>('present');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch session roster and marks
  const fetchSessionRoster = useCallback(async () => {
    const data = await sessionService.getSessionRosterAndRecords(session.id, session.groupId);
    setRoster(data);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [session.id, session.groupId]);

  useEffect(() => {
    fetchSessionRoster();
  }, [fetchSessionRoster]);

  // Start mDNS advertisement and Supabase Realtime subscription on mount
  useEffect(() => {
    if (isSessionActive) {
      // 1. Start mDNS advertising on local network
      networkProximityService.startAdvertising(session.networkSessionId, session.groupCode).then(() => {
        setIsAdvertisingmDNS(true);
      });
    }

    // 2. Subscribe to live Supabase Realtime stream of marks
    const unsubscribeRealtime = sessionService.subscribeToSessionAttendance(session.id, () => {
      fetchSessionRoster();
    });

    return () => {
      networkProximityService.stopAdvertising();
      unsubscribeRealtime();
    };
  }, [session.id, session.networkSessionId, session.groupCode, isSessionActive, fetchSessionRoster]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchSessionRoster();
  };

  // Timer countdown and auto-close
  useEffect(() => {
    if (!isSessionActive || secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsSessionActive(false);
          setIsAdvertisingmDNS(false);
          networkProximityService.stopAdvertising();
          sessionService.closeAttendanceSession(session.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSessionActive, secondsRemaining, session.id]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const presentCount = roster.filter((r) => r.status !== 'absent').length;
  const absentCount = roster.filter((r) => r.status === 'absent').length;
  const totalCount = roster.length;
  const progressPercent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const handleOpenOverrideModal = (student: SessionRosterStudent) => {
    setSelectedStudent(student);
    setTargetStatus(student.status === 'absent' ? 'present' : 'absent');
    setOverrideReason(student.overrideReason || '');
    setModalVisible(true);
  };

  const handleApplyOverride = async () => {
    if (!selectedStudent) return;
    if (targetStatus !== 'absent' && !overrideReason.trim()) {
      Alert.alert('Reason Required', 'Every manual status override requires a brief audit reason.');
      return;
    }

    setIsSubmittingOverride(true);
    const result = await sessionService.manualRecordOverride({
      sessionId: session.id,
      studentId: selectedStudent.studentId,
      status: targetStatus,
      reason: overrideReason.trim(),
    });
    setIsSubmittingOverride(false);

    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to save override.');
      return;
    }

    // Refresh roster
    fetchSessionRoster();
    setModalVisible(false);
    setSelectedStudent(null);
  };

  const handleEndSession = () => {
    Alert.alert(
      'End Attendance Session',
      'Are you sure you want to close this session? Students will no longer be able to mark attendance.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            setIsSessionActive(false);
            setIsAdvertisingmDNS(false);
            setSecondsRemaining(0);
            networkProximityService.stopAdvertising();
            await sessionService.closeAttendanceSession(session.id);
          },
        },
      ]
    );
  };

  const filteredRoster = roster.filter((item) => {
    if (filterTab === 'present') return item.status !== 'absent';
    if (filterTab === 'absent') return item.status === 'absent';
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={session.groupCode || 'Attendance Session'}
        subtitle={`Session: ${session.date} • ${session.period}`}
        showBack
        rightElement={
          <Badge
            label={isSessionActive ? 'LIVE' : 'CLOSED'}
            variant={isSessionActive ? 'success' : 'neutral'}
            dot
          />
        }
      />
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
        {/* Live Attendance Counter & Realtime Status */}
        <Card variant="glow" style={styles.liveDashboardCard}>
          <View style={styles.counterRow}>
            <View>
              <Text style={styles.counterLabel}>LIVE PRESENT COUNT</Text>
              <Text style={styles.counterValue}>
                {presentCount} <Text style={styles.counterTotal}>/ {totalCount}</Text>
              </Text>
            </View>

            <View style={styles.timerBox}>
              <Ionicons
                name="timer-outline"
                size={18}
                color={secondsRemaining < 60 && isSessionActive ? Colors.danger : Colors.primaryLight}
              />
              <Text
                style={[
                  styles.timerText,
                  secondsRemaining < 60 && isSessionActive && { color: Colors.danger },
                  !isSessionActive && { color: Colors.textMuted },
                ]}
              >
                {isSessionActive ? formatTimer(secondsRemaining) : 'Closed'}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          {/* mDNS & Realtime Broadcast Banner */}
          <View style={styles.broadcastBanner}>
            <Ionicons
              name={isAdvertisingmDNS ? 'wifi' : 'wifi-outline'}
              size={18}
              color={isAdvertisingmDNS ? Colors.secondary : Colors.textMuted}
            />
            <View style={styles.broadcastTextCol}>
              <Text style={styles.broadcastTitle}>
                {isAdvertisingmDNS
                  ? 'Advertising mDNS Proximity Signal'
                  : 'mDNS Broadcast Inactive'}
              </Text>
              <Text style={styles.broadcastDesc}>
                {session.networkSessionId} (_sas-session._tcp.local) • Realtime Active
              </Text>
            </View>
            <Badge
              label={isAdvertisingmDNS ? 'ON AIR' : 'OFF'}
              variant={isAdvertisingmDNS ? 'secondary' : 'neutral'}
              size="sm"
            />
          </View>
        </Card>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.tabChip, filterTab === 'all' && styles.tabChipActive]}
            onPress={() => setFilterTab('all')}
          >
            <Text style={[styles.tabText, filterTab === 'all' && styles.tabTextActive]}>
              All ({totalCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabChip, filterTab === 'present' && styles.tabChipActive]}
            onPress={() => setFilterTab('present')}
          >
            <Text style={[styles.tabText, filterTab === 'present' && styles.tabTextActive]}>
              Present ({presentCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabChip, filterTab === 'absent' && styles.tabChipActive]}
            onPress={() => setFilterTab('absent')}
          >
            <Text style={[styles.tabText, filterTab === 'absent' && styles.tabTextActive]}>
              Absent ({absentCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Live Roster & Manual Override Section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {filterTab === 'present'
                ? `Present Students (${presentCount})`
                : filterTab === 'absent'
                ? `Absent Students (${absentCount})`
                : `Live Session Roster (${totalCount})`}
            </Text>
            <Text style={styles.sectionSubtitle}>
              Updates live via Supabase Realtime • Tap student for manual audit override
            </Text>
          </View>
        </View>

        {/* Student List */}
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.primaryLight} />
            <Text style={styles.loadingText}>Loading session roster…</Text>
          </View>
        ) : filteredRoster.length === 0 ? (
          <Card variant="bordered" style={styles.emptyCard}>
            <Ionicons name="people-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Students in this View</Text>
          </Card>
        ) : (
          <View style={styles.rosterList}>
            {filteredRoster.map((student) => (
              <Card
                key={student.studentId}
                style={styles.studentCard}
                onPress={() => handleOpenOverrideModal(student)}
              >
                <View style={styles.studentCardContent}>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentRollNo}>Roll: {student.rollNo}</Text>
                    {student.deviceId && student.status !== 'absent' && (
                      <View style={styles.deviceAuditBadge}>
                        <Ionicons name="phone-portrait-outline" size={11} color={Colors.textMuted} />
                        <Text style={styles.deviceAuditText}>{student.deviceId}</Text>
                      </View>
                    )}
                    {student.overrideReason && (
                      <Text style={styles.overrideReasonText}>
                        Audit Note: "{student.overrideReason}"
                      </Text>
                    )}
                  </View>

                  <View style={styles.statusCol}>
                    <Badge
                      label={
                        student.status === 'present'
                          ? 'Present (WiFi)'
                          : student.status === 'manual_override'
                          ? 'Override'
                          : student.status === 'late'
                          ? 'Late'
                          : 'Absent'
                      }
                      variant={
                        student.status === 'present'
                          ? 'success'
                          : student.status === 'manual_override' || student.status === 'late'
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                    />
                    {student.markedAt && (
                      <Text style={styles.markedAtText}>{student.markedAt}</Text>
                    )}
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Session Action Footer */}
        {isSessionActive && (
          <Button
            title="End Session Early"
            variant="danger"
            size="md"
            iconName="stop-circle-outline"
            onPress={handleEndSession}
            style={styles.endSessionBtn}
          />
        )}
      </ScrollView>

      {/* Manual Override Audit Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Card variant="elevated" style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manual Status Override</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalStudentName}>
              {selectedStudent?.name} ({selectedStudent?.rollNo})
            </Text>
            <Text style={styles.modalSubtitle}>
              Current Status: {selectedStudent?.status?.toUpperCase()}
            </Text>

            {/* Target status selector */}
            <View style={styles.statusSelectRow}>
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  targetStatus === 'present' && styles.statusOptionActiveSuccess,
                ]}
                onPress={() => setTargetStatus('present')}
              >
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                <Text style={styles.statusOptionText}>Present</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusOption,
                  targetStatus === 'late' && styles.statusOptionActiveWarning,
                ]}
                onPress={() => setTargetStatus('late')}
              >
                <Ionicons name="time" size={18} color={Colors.warning} />
                <Text style={styles.statusOptionText}>Late</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusOption,
                  targetStatus === 'absent' && styles.statusOptionActiveDanger,
                ]}
                onPress={() => setTargetStatus('absent')}
              >
                <Ionicons name="close-circle" size={18} color={Colors.danger} />
                <Text style={styles.statusOptionText}>Absent</Text>
              </TouchableOpacity>
            </View>

            {targetStatus !== 'absent' && (
              <Input
                label="Audit Reason (Mandatory)"
                placeholder="e.g. Phone battery died / Verified in seat"
                value={overrideReason}
                onChangeText={setOverrideReason}
                containerStyle={{ marginTop: Spacing.md }}
              />
            )}

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Confirm & Save"
                variant="primary"
                loading={isSubmittingOverride}
                onPress={handleApplyOverride}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
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
  liveDashboardCard: {
    padding: Spacing.lg,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  counterLabel: {
    ...Typography.captionBold,
    color: Colors.textMuted,
    letterSpacing: 1,
    fontSize: 11,
  },
  counterValue: {
    ...Typography.h1,
    fontSize: 34,
    color: Colors.text,
  },
  counterTotal: {
    fontSize: 20,
    color: Colors.textMuted,
    fontWeight: '400',
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.xs,
  },
  timerText: {
    ...Typography.h3,
    fontSize: 20,
    color: Colors.primaryLight,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.full,
  },
  broadcastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    gap: Spacing.sm,
  },
  broadcastTextCol: {
    flex: 1,
  },
  broadcastTitle: {
    ...Typography.captionBold,
    color: Colors.secondary,
    fontSize: 12,
  },
  broadcastDesc: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textMuted,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  tabChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
  },
  tabChipActive: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primaryLight,
  },
  tabText: {
    ...Typography.captionBold,
    color: Colors.textMuted,
    fontSize: 12,
  },
  tabTextActive: {
    color: Colors.primaryLight,
  },
  sectionHeader: {
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
    color: Colors.textMuted,
  },
  rosterList: {
    gap: Spacing.sm,
  },
  studentCard: {
    padding: Spacing.sm,
  },
  studentCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  studentName: {
    ...Typography.bodyBold,
    fontSize: 15,
  },
  studentRollNo: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  deviceAuditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  deviceAuditText: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textMuted,
  },
  overrideReasonText: {
    ...Typography.caption,
    color: Colors.warning,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  statusCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  markedAtText: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textMuted,
  },
  endSessionBtn: {
    marginTop: Spacing.md,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  modalStudentName: {
    ...Typography.bodyBold,
    color: Colors.primaryLight,
    fontSize: 16,
  },
  modalSubtitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  statusSelectRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.xs,
  },
  statusOptionActiveSuccess: {
    borderColor: Colors.success,
    backgroundColor: Colors.successLight,
  },
  statusOptionActiveWarning: {
    borderColor: Colors.warning,
    backgroundColor: Colors.warningLight,
  },
  statusOptionActiveDanger: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerLight,
  },
  statusOptionText: {
    ...Typography.bodyBold,
    fontSize: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
});
