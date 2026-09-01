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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StaffStackParamList } from '../../types/navigation';

export const StaffProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Staff Profile" subtitle="Account & App Preferences" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Card */}
        <Card variant="elevated" style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="school" size={36} color={Colors.primaryLight} />
          </View>
          <Text style={styles.name}>{user?.name || 'Dr. Sujith Philips'}</Text>
          <Text style={styles.email}>{user?.email || 'sujith.philips@college.edu'}</Text>
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
          <View style={styles.row}>
            <Text style={styles.label}>Build Type</Text>
            <Text style={styles.value}>EAS Development Client (Expo SDK 57)</Text>
          </View>
        </Card>

        {/* Diagnostics & Sign Out */}
        <View style={styles.actions}>
          <Button
            title="Local WiFi Diagnostics Tool"
            variant="outline"
            iconName="wifi"
            onPress={() => navigation.navigate('NetworkTest')}
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
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight + '55',
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
