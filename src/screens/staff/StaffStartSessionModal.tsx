import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { CourseGroup, AttendanceSession } from '../../types';
import { sessionService } from '../../services/sessionService';

interface StaffStartSessionModalProps {
  visible: boolean;
  group: CourseGroup;
  staffId: string;
  onClose: () => void;
  onSessionStarted: (session: AttendanceSession) => void;
}

const DURATIONS = [
  { label: '3 Mins', value: 3 },
  { label: '5 Mins (Default)', value: 5 },
  { label: '10 Mins', value: 10 },
  { label: '15 Mins', value: 15 },
];

export const StaffStartSessionModal: React.FC<StaffStartSessionModalProps> = ({
  visible,
  group,
  staffId,
  onClose,
  onSessionStarted,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  const [period, setPeriod] = useState(group.schedulePeriod || '09:00 - 10:00 AM');
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setError(null);
    setIsLoading(true);

    const { session, error: err } = await sessionService.startAttendanceSession({
      groupId: group.id,
      groupName: group.name,
      groupCode: group.code,
      staffId,
      date,
      period,
      durationMinutes,
    });

    setIsLoading(false);

    if (err || !session) {
      setError(err?.message || 'Failed to start session.');
      return;
    }

    onClose();
    onSessionStarted(session);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Start Attendance Session</Text>
              <Text style={styles.subtitle}>{group.name} ({group.code} - {group.section})</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Course Summary Card */}
            <Card variant="elevated" style={styles.groupCard}>
              <View style={styles.codeRow}>
                <Badge label={group.code} variant="primary" size="sm" />
                <Badge label={group.section} variant="neutral" size="sm" />
                <Badge label={`${group.studentCount || 0} Students`} variant="secondary" size="sm" />
              </View>
              <Text style={styles.courseTitle}>{group.name}</Text>
              <Text style={styles.scheduleText}>
                Weekly Schedule: {group.scheduleDay} ({group.schedulePeriod})
              </Text>
            </Card>

            {/* Session Configuration */}
            <Input
              label="Session Date (YYYY-MM-DD)"
              placeholder="2026-09-01"
              leftIcon="calendar-outline"
              value={date}
              onChangeText={setDate}
            />

            <Input
              label="Class Period"
              placeholder="09:00 - 10:00 AM"
              leftIcon="time-outline"
              value={period}
              onChangeText={setPeriod}
            />

            {/* Duration Selector */}
            <Text style={styles.sectionLabel}>Session Duration Window</Text>
            <View style={styles.durationGrid}>
              {DURATIONS.map((dur) => {
                const isSelected = durationMinutes === dur.value;
                return (
                  <TouchableOpacity
                    key={dur.value}
                    style={[styles.durationChip, isSelected && styles.durationChipActive]}
                    onPress={() => setDurationMinutes(dur.value)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="timer-outline"
                      size={16}
                      color={isSelected ? Colors.primaryLight : Colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.durationText,
                        isSelected && styles.durationTextActive,
                      ]}
                    >
                      {dur.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.durationHelp}>
              Session auto-closes when duration ends. Students cannot mark attendance after closing.
            </Text>

            <Button
              title={`Start ${durationMinutes}-Minute Session`}
              variant="primary"
              size="lg"
              iconName="radio"
              loading={isLoading}
              onPress={handleStart}
              style={styles.startBtn}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  title: {
    ...Typography.h2,
    fontSize: 20,
  },
  subtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.danger + '44',
  },
  errorText: {
    ...Typography.captionBold,
    color: Colors.danger,
    flex: 1,
  },
  groupCard: {
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  codeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  courseTitle: {
    ...Typography.bodyBold,
    fontSize: 16,
  },
  scheduleText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  sectionLabel: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.xs,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    width: '48%',
    justifyContent: 'center',
  },
  durationChipActive: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primaryLight,
  },
  durationText: {
    ...Typography.captionBold,
    color: Colors.textMuted,
    fontSize: 12,
  },
  durationTextActive: {
    color: Colors.primaryLight,
  },
  durationHelp: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  startBtn: {
    marginTop: Spacing.xs,
  },
});
