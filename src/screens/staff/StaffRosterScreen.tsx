import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
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

type StaffRosterScreenProps = NativeStackScreenProps<StaffStackParamList, 'StaffRoster'>;

interface RosterStudent {
  id: string;
  name: string;
  rollNo: string;
  email: string;
  attendancePercentage: number;
  joinedAt: string;
}

const INITIAL_STUDENTS: RosterStudent[] = [
  {
    id: 's1',
    name: 'Alex Johnson',
    rollNo: '21CS1085',
    email: 'alex.j@student.college.edu',
    attendancePercentage: 96,
    joinedAt: '2026-08-10',
  },
  {
    id: 's2',
    name: 'Priya Sharma',
    rollNo: '21CS1086',
    email: 'priya.s@student.college.edu',
    attendancePercentage: 92,
    joinedAt: '2026-08-10',
  },
  {
    id: 's3',
    name: 'Rahul Verma',
    rollNo: '21CS1087',
    email: 'rahul.v@student.college.edu',
    attendancePercentage: 88,
    joinedAt: '2026-08-11',
  },
  {
    id: 's4',
    name: 'Sneha Patel',
    rollNo: '21CS1088',
    email: 'sneha.p@student.college.edu',
    attendancePercentage: 95,
    joinedAt: '2026-08-12',
  },
  {
    id: 's5',
    name: 'Vikram Mehta',
    rollNo: '21CS1089',
    email: 'vikram.m@student.college.edu',
    attendancePercentage: 84,
    joinedAt: '2026-08-12',
  },
];

export const StaffRosterScreen: React.FC<StaffRosterScreenProps> = ({ route }) => {
  const { group } = route.params;
  const [students, setStudents] = useState<RosterStudent[]>(INITIAL_STUDENTS);

  const handleRemoveStudent = (student: RosterStudent) => {
    Alert.alert(
      'Remove Student from Roster',
      `Are you sure you want to remove ${student.name} (${student.rollNo}) from ${group.code}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setStudents((prev) => prev.filter((s) => s.id !== student.id));
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={`${group.code} Roster`}
        subtitle={`${students.length} Enrolled Students • ${group.section}`}
        showBack
      />
      <View style={styles.container}>
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Card style={styles.studentCard}>
              <View style={styles.studentRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </Text>
                </View>

                <View style={styles.studentDetails}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.rollNo}>Roll: {item.rollNo}</Text>
                  <Text style={styles.email}>{item.email}</Text>
                </View>

                <View style={styles.rightCol}>
                  <Badge
                    label={`${item.attendancePercentage}%`}
                    variant={
                      item.attendancePercentage >= 85
                        ? 'success'
                        : item.attendancePercentage >= 75
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
  listContent: {
    gap: Spacing.sm,
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
