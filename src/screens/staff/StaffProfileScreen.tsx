import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export const StaffProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Staff Profile" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Card */}
        <Card variant="elevated" style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="school" size={36} color={Colors.primaryLight} />
          </View>
          <Text style={styles.name}>{user?.name || 'Faculty Staff'}</Text>
          <Text style={styles.email}>{user?.email || 'staff@college.edu'}</Text>
          <Badge label="Faculty Staff Account" variant="primary" style={{ marginTop: Spacing.sm }} />
        </Card>

        {/* Info Items */}
        <Card style={styles.detailsCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Staff ID</Text>
            <Text style={styles.value}>{user?.staffId || 'CSE-FAC-104'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Department</Text>
            <Text style={styles.value}>{user?.department || 'Computer Science & Engg'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Mobile</Text>
            <Text style={styles.value}>{user?.mobile || '+91 98765 43210'}</Text>
          </View>
        </Card>

        {/* Sign Out */}
        <View style={styles.actions}>
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
    padding: Spacing.md,
    gap: Spacing.md,
  },
  profileCard: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight + '55',
  },
  name: {
    ...Typography.h2,
    fontSize: 20,
  },
  email: {
    ...Typography.caption,
    marginTop: 2,
  },
  detailsCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  label: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
  },
  value: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.text,
  },
  actions: {
    marginTop: Spacing.sm,
  },
});

