import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StaffStackParamList } from '../../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

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

  const handleStartSession = () => {
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
            <Text style={styles.infoValue}>{group.studentCount || 85} Students</Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Button
            title="Start Live Attendance Session"
            variant="primary"
            size="lg"
            iconName="radio"
            onPress={handleStartSession}
          />
          <Button
            title="View & Manage Student Roster"
            variant="secondary"
            size="md"
            iconName="people"
            onPress={() => navigation.navigate('StaffRoster', { group })}
          />
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
