import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StaffStackParamList } from '../../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { groupService, RosterMember } from '../../services/groupService';

type StaffRosterScreenProps = NativeStackScreenProps<StaffStackParamList, 'StaffRoster'>;

export const StaffRosterScreen: React.FC<StaffRosterScreenProps> = ({ route }) => {
  const { group } = route.params;
  const [students, setStudents] = useState<RosterMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRoster = useCallback(async () => {
    const data = await groupService.getCourseGroupRoster(group.id);
    setStudents(data);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [group.id]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchRoster();
  };

  const handleRemoveStudent = (student: RosterMember) => {
    Alert.alert(
      'Remove Student from Roster',
      `Are you sure you want to remove ${student.name} (${student.rollNo}) from ${group.code}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const success = await groupService.removeStudentFromRoster(group.id, student.studentId);
            if (success) {
              setStudents((prev) => prev.filter((s) => s.studentId !== student.studentId));
            } else {
              Alert.alert('Error', 'Failed to remove student from roster.');
            }
          },
        },
      ]
    );
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={`${group.code} Roster`}
        subtitle={`${students.length} Enrolled Students • ${group.section}`}
        showBack
      />
      <View style={styles.container}>
        {/* Search Bar */}
        <Input
          placeholder="Search by name, roll number, or email..."
          leftIcon="search-outline"
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={{ marginBottom: Spacing.sm }}
        />

        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.primaryLight} />
            <Text style={styles.loadingText}>Loading enrolled students…</Text>
          </View>
        ) : filteredStudents.length === 0 ? (
          <Card variant="bordered" style={styles.emptyCard}>
            <Ionicons name="people-outline" size={44} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No Students Matched' : 'No Students Enrolled Yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Try a different search keyword.'
                : `Share join code ${group.joinCode} with students to have them appear on this roster.`}
            </Text>
          </Card>
        ) : (
          <FlatList
            data={filteredStudents}
            keyExtractor={(item) => item.studentId}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primaryLight}
              />
            }
            renderItem={({ item }) => (
              <Card style={styles.studentCard}>
                <View style={styles.studentRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {item.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.studentDetails}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.rollNo}>Roll: {item.rollNo}</Text>
                    <Text style={styles.email}>{item.email}</Text>
                  </View>

                  <View style={styles.rightCol}>
                    <Badge
                      label={`${item.attendancePercentage || 95}%`}
                      variant={
                        (item.attendancePercentage || 95) >= 85
                          ? 'success'
                          : (item.attendancePercentage || 95) >= 75
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                    />
                    <TouchableOpacity
                      onPress={() => handleRemoveStudent(item)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    padding: Spacing.md,
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
  emptySubtitle: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  listContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  studentCard: {
    padding: Spacing.md,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight + '44',
  },
  avatarText: {
    ...Typography.bodyBold,
    color: Colors.primaryLight,
  },
  studentDetails: {
    flex: 1,
  },
  name: {
    ...Typography.bodyBold,
    fontSize: 15,
  },
  rollNo: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  email: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 11,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  deleteBtn: {
    padding: 4,
  },
});
