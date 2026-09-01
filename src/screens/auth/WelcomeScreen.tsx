import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';

type WelcomeScreenNavProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

interface WelcomeScreenProps {
  navigation: WelcomeScreenNavProp;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const { loginAsStaff, loginAsStudent } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Ionicons name="finger-print" size={42} color={Colors.primaryLight} />
          </View>
          <Text style={styles.brandTitle}>SAS</Text>
          <Text style={styles.brandSubtitle}>Self Attendance System</Text>
          <View style={styles.pillTag}>
            <Text style={styles.pillText}>Fast • Proxy-Resistant • Real-Time</Text>
          </View>
        </View>

        {/* Value Proposition Cards */}
        <View style={styles.cardsContainer}>
          <Card
            variant="elevated"
            style={styles.roleCard}
            onPress={() => navigation.navigate('StaffAuth', { mode: 'login' })}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrapper, styles.staffIconBg]}>
                <Ionicons name="school" size={24} color={Colors.primaryLight} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Staff Portal</Text>
                <Text style={styles.cardDesc}>
                  Create course groups, broadcast attendance sessions & track live roll-calls.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </View>
          </Card>

          <Card
            variant="elevated"
            style={styles.roleCard}
            onPress={() => navigation.navigate('StudentAuth', { mode: 'login' })}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrapper, styles.studentIconBg]}>
                <Ionicons name="person" size={24} color={Colors.secondary} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Student Portal</Text>
                <Text style={styles.cardDesc}>
                  Join course groups with join-codes & mark proximity-verified attendance.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </View>
          </Card>
        </View>

        {/* Quick Demo Shortcuts */}
        <View style={styles.demoSection}>
          <Text style={styles.demoLabel}>⚡ Quick Preview Sign In</Text>
          <View style={styles.demoButtonsRow}>
            <Button
              title="Instant Staff Sign-In"
              variant="outline"
              size="sm"
              iconName="school-outline"
              style={styles.demoBtn}
              onPress={() => loginAsStaff()}
            />
            <Button
              title="Instant Student Sign-In"
              variant="secondary"
              size="sm"
              iconName="person-outline"
              style={styles.demoBtn}
              onPress={() => loginAsStudent()}
            />
          </View>
        </View>

        {/* Bottom Footer Note */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
          <Text style={styles.footerText}>
            Protected by device fingerprinting & WiFi proximity verification
          </Text>
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
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    justifyContent: 'space-between',
  },
  brandContainer: {
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight + '55',
  },
  brandTitle: {
    ...Typography.h1,
    fontSize: 36,
    letterSpacing: 1.5,
    color: Colors.text,
  },
  brandSubtitle: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pillTag: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  pillText: {
    ...Typography.badge,
    color: Colors.primaryLight,
  },
  cardsContainer: {
    gap: Spacing.md,
    marginVertical: Spacing.lg,
  },
  roleCard: {
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  staffIconBg: {
    backgroundColor: Colors.primaryGlow,
  },
  studentIconBg: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
  },
  cardTextContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  cardTitle: {
    ...Typography.h3,
    marginBottom: 4,
  },
  cardDesc: {
    ...Typography.caption,
    lineHeight: 18,
  },
  demoSection: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginVertical: Spacing.md,
  },
  demoLabel: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  demoBtn: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  footerText: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    flex: 1,
  },
});
