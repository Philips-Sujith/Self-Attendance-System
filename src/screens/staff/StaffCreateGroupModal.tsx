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
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { groupService } from '../../services/groupService';
import { CourseGroup } from '../../types';

interface StaffCreateGroupModalProps {
  visible: boolean;
  staffId: string;
  staffName?: string;
  onClose: () => void;
  onGroupCreated: (newGroup: CourseGroup) => void;
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const StaffCreateGroupModal: React.FC<StaffCreateGroupModalProps> = ({
  visible,
  staffId,
  staffName,
  onClose,
  onGroupCreated,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [section, setSection] = useState('Section A');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);
  const [period, setPeriod] = useState('09:00 - 10:00 AM');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return; // Keep at least one
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleCreate = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Course name is required (e.g. Digital System Design).');
      return;
    }
    if (!code.trim()) {
      setError('Course code is required (e.g. CS302).');
      return;
    }
    if (!section.trim()) {
      setError('Section is required (e.g. Section A).');
      return;
    }
    if (!period.trim()) {
      setError('Class period time is required.');
      return;
    }

    setIsLoading(true);
    const scheduleDayStr = selectedDays.join(', ');

    const { group, error: err } = await groupService.createCourseGroup({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      section: section.trim(),
      staffId,
      staffName,
      scheduleDay: scheduleDayStr,
      schedulePeriod: period.trim(),
    });

    setIsLoading(false);

    if (err || !group) {
      setError(err?.message || 'Failed to create course group.');
      return;
    }

    // Reset & Notify
    setName('');
    setCode('');
    setSection('Section A');
    onGroupCreated(group);
    onClose();

    Alert.alert(
      '🎉 Course Group Created!',
      `Join Code for ${group.code}: ${group.joinCode}\n\nShare this code with your students to let them join the class roster.`,
      [{ text: 'Got it' }]
    );
  };

  const previewJoinCode = code ? groupService.generateJoinCode(code) : '---';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.modalSheet}>
          {/* Sheet Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Create Course Group</Text>
              <Text style={styles.subtitle}>Set up a new semester subject and roster</Text>
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

            {/* Live Generated Join Code Preview */}
            <Card variant="glow" style={styles.codePreviewCard}>
              <Text style={styles.previewLabel}>GENERATED JOIN CODE</Text>
              <Text style={styles.previewCode}>{previewJoinCode}</Text>
              <Text style={styles.previewHelp}>
                Students enter this code or tap your shareable deep link to enroll.
              </Text>
            </Card>

            <Input
              label="Course Title"
              placeholder="e.g. Digital System Design"
              leftIcon="book-outline"
              value={name}
              onChangeText={setName}
            />

            <View style={styles.rowInputs}>
              <Input
                label="Course Code"
                placeholder="CS302"
                autoCapitalize="characters"
                leftIcon="pricetag-outline"
                value={code}
                onChangeText={setCode}
                containerStyle={{ flex: 1 }}
              />
              <Input
                label="Section"
                placeholder="Sec A"
                leftIcon="layers-outline"
                value={section}
                onChangeText={setSection}
                containerStyle={{ flex: 1 }}
              />
            </View>

            {/* Schedule Day Selector */}
            <Text style={styles.sectionLabel}>Weekly Schedule Days</Text>
            <View style={styles.daysRow}>
              {WEEK_DAYS.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayChip, isSelected && styles.dayChipActive]}
                    onPress={() => toggleDay(day)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Input
              label="Class Time / Period"
              placeholder="09:00 - 10:00 AM"
              leftIcon="time-outline"
              value={period}
              onChangeText={setPeriod}
              containerStyle={{ marginTop: Spacing.md }}
            />

            <Button
              title="Create Course Group"
              variant="primary"
              size="lg"
              iconName="add-circle-outline"
              loading={isLoading}
              onPress={handleCreate}
              style={styles.submitBtn}
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
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
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
  codePreviewCard: {
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  previewLabel: {
    ...Typography.captionBold,
    color: Colors.textMuted,
    fontSize: 10,
    letterSpacing: 1,
  },
  previewCode: {
    ...Typography.h1,
    fontSize: 28,
    color: Colors.primaryLight,
    letterSpacing: 3,
    marginVertical: 4,
  },
  previewHelp: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  sectionLabel: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  daysRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  dayChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
  },
  dayChipActive: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primaryLight,
  },
  dayText: {
    ...Typography.captionBold,
    color: Colors.textMuted,
    fontSize: 12,
  },
  dayTextActive: {
    color: Colors.primaryLight,
  },
  submitBtn: {
    marginTop: Spacing.lg,
  },
});
