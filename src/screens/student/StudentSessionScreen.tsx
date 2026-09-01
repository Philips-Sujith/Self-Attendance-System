import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StudentStackParamList } from '../../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

type StudentSessionScreenProps = NativeStackScreenProps<
  StudentStackParamList,
  'StudentMarkAttendance'
>;

type NetworkScanState = 'scanning' | 'discovered' | 'failed';

export const StudentSessionScreen: React.FC<StudentSessionScreenProps> = ({
  route,
  navigation,
}) => {
  const { session } = route.params;
  const { user } = useAuth();

  const [scanState, setScanState] = useState<NetworkScanState>('scanning');
  const [isMarking, setIsMarking] = useState(false);
  const [isMarked, setIsMarked] = useState(false);
  const [markedTimestamp, setMarkedTimestamp] = useState<string | null>(null);

  // Mock mDNS network scan discovery
  const runNetworkScan = () => {
    setScanState('scanning');
    setTimeout(() => {
      // In Stage 1 mock: simulate successful mDNS discovery
      setScanState('discovered');
    }, 2000);
  };

  useEffect(() => {
    runNetworkScan();
  }, []);

  const handleMarkAttendance = () => {
    if (scanState !== 'discovered') {
      Alert.alert(
        'Proximity Check Failed',
        'Your device must be verified on the classroom WiFi before attendance can be marked.'
      );
      return;
    }

    setIsMarking(true);
    setTimeout(() => {
      setIsMarking(false);
      setIsMarked(true);
      setMarkedTimestamp(new Date().toLocaleTimeString());
    }, 800);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={session.groupCode || 'Attendance Session'}
        subtitle={session.groupName || 'Digital System Design'}
        showBack
      />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Session Overview Card */}
        <Card variant="elevated" style={styles.overviewCard}>
          <View style={styles.sessionHeaderRow}>
            <View>
              <Text style={styles.sessionDate}>{session.date}</Text>
              <Text style={styles.sessionPeriod}>Period: {session.period}</Text>
            </View>
            <Badge
              label={isMarked ? 'RECORDED' : 'SESSION OPEN'}
              variant={isMarked ? 'success' : 'warning'}
              dot
            />
          </View>
        </Card>

        {/* Local Network Discovery Card */}
        <Card
          variant={
            scanState === 'discovered'
              ? 'glow'
              : scanState === 'failed'
              ? 'bordered'
              : 'elevated'
          }
          style={styles.scanCard}
        >
          {scanState === 'scanning' && (
            <View style={styles.stateContainer}>
              <ActivityIndicator size="large" color={Colors.secondary} />
              <Text style={styles.stateTitle}>Checking Classroom Proximity…</Text>
              <Text style={styles.stateSubtitle}>
                Scanning local WiFi for teacher's advertised mDNS service...
              </Text>
              <View style={styles.sessionPill}>
                <Text style={styles.sessionPillText}>
                  Target: {session.networkSessionId}
                </Text>
              </View>
            </View>
          )}

          {scanState === 'discovered' && (
            <View style={styles.stateContainer}>
              <View style={[styles.statusIconCircle, { backgroundColor: Colors.successLight }]}>
                <Ionicons name="wifi" size={32} color={Colors.success} />
              </View>
              <Text style={[styles.stateTitle, { color: Colors.success }]}>
                Classroom WiFi Verified!
              </Text>
              <Text style={styles.stateSubtitle}>
                mDNS broadcast signal detected from instructor's phone on local network.
              </Text>
              <View style={styles.verifiedRow}>
                <Ionicons name="shield-checkmark" size={14} color={Colors.success} />
                <Text style={styles.verifiedText}>Anti-Proxy Proximity Check Passed</Text>
              </View>
            </View>
          )}

          {scanState === 'failed' && (
            <View style={styles.stateContainer}>
              <View style={[styles.statusIconCircle, { backgroundColor: Colors.dangerLight }]}>
                <Ionicons name="cloud-offline" size={32} color={Colors.danger} />
              </View>
              <Text style={[styles.stateTitle, { color: Colors.danger }]}>
                Network Not Detected
              </Text>
              <Text style={styles.stateSubtitle}>
                Couldn't detect classroom network — make sure you are connected to the class WiFi
                and AP isolation is disabled.
              </Text>
              <Button
                title="Retry Network Scan"
                variant="outline"
                size="sm"
                iconName="refresh"
                onPress={runNetworkScan}
                style={{ marginTop: Spacing.md }}
              />
            </View>
          )}
        </Card>

        {/* Anti-Proxy Safeguard Details */}
        <Card style={styles.deviceCard}>
          <View style={styles.deviceRow}>
            <Ionicons name="phone-portrait-outline" size={18} color={Colors.primaryLight} />
            <Text style={styles.deviceLabel}>Bound Device ID:</Text>
            <Text style={styles.deviceVal}>DEV-ENCLAVE-8821</Text>
          </View>
          <Text style={styles.antiProxyNotice}>
            🔒 Anti-Proxy Rule: One device can only mark for one student account per session.
          </Text>
        </Card>

        {/* Action Button / Success Confirmation */}
        {isMarked ? (
          <Card variant="glow" style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
            <Text style={styles.successTitle}>Attendance Marked!</Text>
            <Text style={styles.successCourse}>{session.groupName}</Text>
            <Text style={styles.successTime}>
              Recorded at: {markedTimestamp} (Proximity WiFi Verified)
            </Text>
            <Button
              title="Return to Dashboard"
              variant="secondary"
              size="md"
              onPress={() => navigation.goBack()}
              style={{ marginTop: Spacing.md, width: '100%' }}
            />
          </Card>
        ) : (
          <Button
            title={
              scanState === 'discovered'
                ? 'Mark My Attendance'
                : 'Waiting for Local WiFi Detection…'
            }
            variant="primary"
            size="lg"
            iconName="finger-print"
            disabled={scanState !== 'discovered'}
            loading={isMarking}
            onPress={handleMarkAttendance}
            style={styles.markButton}
          />
        )}
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
  overviewCard: {
    padding: Spacing.md,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDate: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
  },
  sessionPeriod: {
    ...Typography.bodyBold,
    marginTop: 2,
  },
  scanCard: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  stateContainer: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  stateTitle: {
    ...Typography.h2,
    fontSize: 18,
    textAlign: 'center',
  },
  stateSubtitle: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 2,
  },
  sessionPill: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  sessionPillText: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textMuted,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  verifiedText: {
    ...Typography.captionBold,
    color: Colors.success,
    fontSize: 12,
  },
  deviceCard: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  deviceLabel: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
  },
  deviceVal: {
    ...Typography.caption,
    color: Colors.primaryLight,
  },
  antiProxyNotice: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  markButton: {
    marginTop: Spacing.sm,
  },
  successCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.surfaceElevated,
  },
  successTitle: {
    ...Typography.h1,
    fontSize: 22,
    color: Colors.success,
    marginTop: Spacing.sm,
  },
  successCourse: {
    ...Typography.bodyBold,
    marginTop: 4,
  },
  successTime: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
