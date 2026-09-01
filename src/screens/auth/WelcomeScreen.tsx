import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';

type WelcomeScreenNavProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

interface WelcomeScreenProps {
  navigation: WelcomeScreenNavProp;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Ionicons name="finger-print" size={44} color={Colors.primaryLight} />
          </View>
          <Text style={styles.brandTitle}>SAS</Text>
          <Text style={styles.brandSubtitle}>Self Attendance System</Text>
          <View style={styles.pillTag}>
            <Text style={styles.pillText}>Fast • Proxy-Resistant • Real-Time</Text>
          </View>
        </View>

        {/* Role Portals Selection */}
        <View style={styles.cardsContainer}>
          <Card
            variant="elevated"
            style={styles.roleCard}
            onPress={() => navigation.navigate('StaffAuth', { mode: 'login' })}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrapper, styles.staffIconBg]}>
                <Ionicons name="school" size={26} color={Colors.primaryLight} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Faculty / Staff Portal</Text>
                <Text style={styles.cardDesc}>
                  Manage course groups, start live attendance sessions, and export attendance spreadsheets.
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
                <Ionicons name="person" size={26} color={Colors.secondary} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Student Portal</Text>
                <Text style={styles.cardDesc}>
                  Join course groups via join codes and mark proximity-verified class attendance.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </View>
          </Card>
        </View>

        {/* Bottom Security Footer */}
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
    paddingVertical: Spacing.md,
    justifyContent: 'space-between',
  },
  brandContainer: {
    alignItems: 'center',
    marginVertical: Spacing.md,
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
    fontSize: 32,
    letterSpacing: 1.5,
    color: Colors.text,
  },
  brandSubtitle: {
    ...Typography.body,
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pillTag: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  pillText: {
    ...Typography.captionBold,
    color: Colors.secondary,
    fontSize: 11,
    letterSpacing: 0.5,
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
    borderWidth: 1,
    borderColor: Colors.primaryLight + '44',
  },
  studentIconBg: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: Colors.secondary + '44',
  },
  cardTextContainer: {
    flex: 1,
    marginRight: Spacing.xs,
  },
  cardTitle: {
    ...Typography.h3,
    fontSize: 16,
    color: Colors.text,
  },
  cardDesc: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 3,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  footerText: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
});
