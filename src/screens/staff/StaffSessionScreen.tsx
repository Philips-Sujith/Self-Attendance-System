import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StaffStackParamList } from '../../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { AttendanceRecord, AttendanceStatus } from '../../types';

type StaffSessionScreenProps = NativeStackScreenProps<StaffStackParamList, 'StaffSessionLive'>;

interface MockStudentRosterItem {
  id: string;
  name: string;
  rollNo: string;
  status: AttendanceStatus | 'absent';
  markedAt?: string;
  overrideReason?: string;
  verificationMethod?: 'wifi_local_network' | 'manual_override';
  deviceId?: string;
}

const INITIAL_ROSTER: MockStudentRosterItem[] = [
  {
    id: 's1',
    name: 'Alex Johnson',
    rollNo: '21CS1085',
    status: 'present',
    markedAt: '09:02:15 AM',
    verificationMethod: 'wifi_local_network',
    deviceId: 'DEV-IPHONE-9981',
  },
  {
    id: 's2',
    name: 'Priya Sharma',
    rollNo: '21CS1086',
    status: 'present',
    markedAt: '09:02:44 AM',
    verificationMethod: 'wifi_local_network',
    deviceId: 'DEV-PIXEL-4122',
  },
  {
    id: 's3',
    name: 'Rahul Verma',
    rollNo: '21CS1087',
    status: 'present',
    markedAt: '09:03:02 AM',
    verificationMethod: 'wifi_local_network',
    deviceId: 'DEV-SAMS-7719',
  },
  {
    id: 's4',
    name: 'Sneha Patel',
    rollNo: '21CS1088',
    status: 'absent',
  },
  {
    id: 's5',
    name: 'Vikram Mehta',
    rollNo: '21CS1089',
    status: 'absent',
  },
  {
    id: 's6',
    name: 'Ananya Rao',
    rollNo: '21CS1090',
    status: 'manual_override',
    markedAt: '09:04:10 AM',
    verificationMethod: 'manual_override',
    overrideReason: 'WiFi client isolation glitch on phone',
    deviceId: 'DEV-MANUAL-001',
  },
];

export const StaffSessionScreen: React.FC<StaffSessionScreenProps> = ({ route, navigation }) => {
  const { session } = route.params;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(session.durationMinutes * 60);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(session.status === 'active');
  const [roster, setRoster] = useState<MockStudentRosterItem[]>(INITIAL_ROSTER);

  // Manual Override Modal state
  const [selectedStudent, setSelectedStudent] = useState<MockStudentRosterItem | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [targetStatus, setTargetStatus] = useState<AttendanceStatus>('present');
  const [modalVisible, setModalVisible] = useState(false);

  // Timer countdown
  useEffect(() => {
    if (!isSessionActive || secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsSessionActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSessionActive, secondsRemaining]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const presentCount = roster.filter((r) => r.status !== 'absent').length;
  const totalCount = roster.length;
  const progressPercent = Math.round((presentCount / totalCount) * 100);

  const handleOpenOverrideModal = (student: MockStudentRosterItem) => {
    setSelectedStudent(student);
    setTargetStatus(student.status === 'absent' ? 'present' : 'absent');
    setOverrideReason('');
    setModalVisible(true);
  };

  const handleApplyOverride = () => {
    if (!selectedStudent) return;
    if (targetStatus !== 'absent' && !overrideReason.trim()) {
      Alert.alert('Reason Required', 'Every manual status override requires a brief audit reason.');
      return;
    }

    setRoster((prev) =>
      prev.map((item) =>
        item.id === selectedStudent.id
          ? {
              ...item,
              status: targetStatus === 'absent' ? 'absent' : 'manual_override',
              verificationMethod: 'manual_override',
              overrideReason: overrideReason.trim() || 'Manual adjustment by staff',
              markedAt: new Date().toLocaleTimeString(),
            }
          : item
      )
    );

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
          onPress: () => {
            setIsSessionActive(false);
            setSecondsRemaining(0);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={session.groupCode || 'CS302'}
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
      <ScrollView contentContainerStyle={styles.container}>
        {/* Live Attendance Counter & Status */}
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
                color={secondsRemaining < 60 ? Colors.danger : Colors.primaryLight}
              />
              <Text
                style={[
                  styles.timerText,
                  secondsRemaining < 60 && { color: Colors.danger },
                ]}
              >
                {formatTimer(secondsRemaining)}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          {/* Local Network mDNS Broadcast status */}
          <View style={styles.broadcastBanner}>
            <Ionicons
              name={isSessionActive ? 'wifi' : 'wifi-outline'}
              size={18}
              color={isSessionActive ? Colors.secondary : Colors.textMuted}
            />
            <View style={styles.broadcastTextCol}>
              <Text style={styles.broadcastTitle}>
                {isSessionActive ? 'Advertising mDNS Service' : 'mDNS Broadcast Inactive'}
              </Text>
              <Text style={styles.broadcastDesc}>
                {session.networkSessionId} (_sas-session._tcp.local)
              </Text>
            </View>
          </View>
        </Card>

        {/* Live Roster & Manual Override Section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Session Roster ({totalCount})</Text>
            <Text style={styles.sectionSubtitle}>
              Tap any student for manual audit override
            </Text>
          </View>
        </View>

        {/* Student List */}
        <View style={styles.rosterList}>
          {roster.map((student) => (
            <Card
              key={student.id}
              style={styles.studentCard}
              onPress={() => handleOpenOverrideModal(student)}
            >
              <View style={styles.studentCardContent}>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.studentRollNo}>{student.rollNo}</Text>
                  {student.overrideReason && (
                    <Text style={styles.overrideReasonText}>
                      Reason: "{student.overrideReason}"
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
                        : 'Absent'
                    }
                    variant={
                      student.status === 'present'
                        ? 'success'
                        : student.status === 'manual_override'
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
                <Text style={styles.statusOptionText}>Mark Present</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusOption,
                  targetStatus === 'absent' && styles.statusOptionActiveDanger,
                ]}
                onPress={() => setTargetStatus('absent')}
              >
                <Ionicons name="close-circle" size={18} color={Colors.danger} />
                <Text style={styles.statusOptionText}>Mark Absent</Text>
              </TouchableOpacity>
            </View>

            <Input
              label="Audit Reason (Required)"
              placeholder="e.g. WiFi issue / Late with permission"
              value={overrideReason}
              onChangeText={setOverrideReason}
              containerStyle={{ marginTop: Spacing.md }}
            />

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
    gap: Spacing.sm,
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
  statusOptionActiveDanger: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerLight,
  },
  statusOptionText: {
    ...Typography.bodyBold,
    fontSize: 13,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});
