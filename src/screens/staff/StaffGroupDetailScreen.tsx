import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Share,
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
import { useAuth } from '../../context/AuthContext';
import { AttendanceSession } from '../../types';
import { StaffStartSessionModal } from './StaffStartSessionModal';

type StaffGroupDetailScreenProps = NativeStackScreenProps<
  StaffStackParamList,
  'StaffGroupDetail'
>;

export const StaffGroupDetailScreen: React.FC<StaffGroupDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { group } = route.params;
  const { user } = useAuth();
  const [startModalVisible, setStartModalVisible] = useState(false);

  const handleShareJoinCode = async () => {
    try {
      await Share.share({
        message: `Join ${group.name} (${group.code} - ${group.section}) on SAS app using Join Code: ${group.joinCode} or link: sas://join/${group.joinCode}`,
        title: `Join Code for ${group.code}`,
      });
    } catch (error) {
      Alert.alert('Share Failed', 'Could not open share dialog.');
    }
  };

  const handleSessionStarted = (session: AttendanceSession) => {
    navigation.navigate('StaffSessionLive', { session });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={group.code}
        subtitle={`${group.name} • ${group.section}`}
        showBack
      />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Join Code Highlight Card */}
        <Card variant="glow" style={styles.joinCodeCard}>
          <Text style={styles.cardHeaderSmall}>STUDENT ENROLLMENT CODE</Text>
          <View style={styles.codeRow}>
            <Text style={styles.joinCodeLarge}>{group.joinCode}</Text>
            <Button
              title="Share Code"
              size="sm"
              variant="outline"
              iconName="share-social-outline"
              onPress={handleShareJoinCode}
            />
          </View>
          <Text style={styles.cardHelperText}>
            Share this code in class or on WhatsApp. Students enter it once to join the
            course roster.
          </Text>
        </Card>

        {/* Schedule & Info */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionHeading}>Course Details</Text>
          <View style={styles.infoRow}>
            <Ionicons name="book-outline" size={18} color={Colors.primaryLight} />
            <Text style={styles.infoLabel}>Course Title:</Text>
            <Text style={styles.infoValue}>{group.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primaryLight} />
            <Text style={styles.infoLabel}>Weekly Schedule:</Text>
            <Text style={styles.infoValue}>{group.scheduleDay}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color={Colors.primaryLight} />
            <Text style={styles.infoLabel}>Class Period:</Text>
            <Text style={styles.infoValue}>{group.schedulePeriod}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={18} color={Colors.primaryLight} />
            <Text style={styles.infoLabel}>Enrolled Students:</Text>
            <Text style={styles.infoValue}>{group.studentCount || 0} Students</Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Button
            title="Start Live Attendance Session"
            variant="primary"
            size="lg"
            iconName="radio"
            onPress={() => setStartModalVisible(true)}
          />
          <Button
            title="View & Manage Student Roster"
            variant="secondary"
            size="md"
            iconName="people"
            onPress={() => navigation.navigate('StaffRoster', { group })}
          />
          <Button
            title="Attendance Analytics & CSV Export"
            variant="outline"
            size="md"
            iconName="document-text"
            onPress={() =>
              navigation.navigate('StaffSessionReport', {
                session: {
                  id: 'sess-active-01',
                  groupId: group.id,
                  groupName: group.name,
                  groupCode: group.code,
                  staffId: group.staffId,
                  date: new Date().toISOString().split('T')[0],
                  period: group.schedulePeriod || '09:00 AM',
                  startTime: new Date().toISOString(),
                  endTime: new Date().toISOString(),
                  durationMinutes: 5,
                  status: 'closed',
                  networkSessionId: `SAS-${group.code}-REPORT`,
                },
              })
            }
          />
        </View>
      </ScrollView>

      {/* Start Session Configuration Modal */}
      {user && (
        <StaffStartSessionModal
          visible={startModalVisible}
          group={group}
          staffId={user.id}
          onClose={() => setStartModalVisible(false)}
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
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  joinCodeCard: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  cardHeaderSmall: {
    ...Typography.captionBold,
    color: Colors.textMuted,
    letterSpacing: 1,
    fontSize: 11,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.md,
  },
  joinCodeLarge: {
    ...Typography.h1,
    fontSize: 32,
    letterSpacing: 4,
    color: Colors.primaryLight,
  },
  cardHelperText: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
  infoCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectionHeading: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  infoLabel: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
    minWidth: 120,
  },
  infoValue: {
    ...Typography.body,
    flex: 1,
    color: Colors.text,
  },
  actionsContainer: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
});
