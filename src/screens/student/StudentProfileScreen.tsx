import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StudentStackParamList } from '../../types/navigation';

export const StudentProfileScreen: React.FC = () => {
  const { user, logout, switchRole } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Student Profile" subtitle="Account & Enrolled Roster" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Card */}
        <Card variant="elevated" style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={36} color={Colors.secondary} />
          </View>
          <Text style={styles.name}>{user?.name || 'Alex Johnson'}</Text>
          <Text style={styles.email}>{user?.email || 'alex.j@student.college.edu'}</Text>
          <Badge
            label="Verified Student"
            variant="info"
            style={{ marginTop: Spacing.sm }}
          />
        </Card>

        {/* Academic Details */}
        <Card style={styles.detailsCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Roll Number</Text>
            <Text style={styles.value}>{user?.rollNo || '21CS1085'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Class / Section</Text>
            <Text style={styles.value}>{user?.classSection || 'CSE Sec B'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Department</Text>
            <Text style={styles.value}>
              {user?.department || 'Computer Science & Engg'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Mobile</Text>
            <Text style={styles.value}>{user?.mobile || '+91 91234 56789'}</Text>
          </View>
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="🧪 Local WiFi Proximity Test Tool (§9)"
            variant="secondary"
            iconName="wifi"
            onPress={() => navigation.navigate('NetworkTest')}
          />
          <Button
            title="Switch to Staff Flow (Preview)"
            variant="outline"
            iconName="swap-horizontal"
            onPress={() => switchRole('staff')}
          />
          <Button
            title="Sign Out"
            variant="danger"
            iconName="log-out-outline"
            onPress={logout}
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
  profileCard: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.secondary + '55',
  },
  name: {
    ...Typography.h2,
  },
  email: {
    ...Typography.caption,
    marginTop: 2,
  },
  detailsCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
  },
  value: {
    ...Typography.body,
    color: Colors.text,
  },
  actions: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
});
