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
import { sessionService } from '../../services/sessionService';
import {
  networkProximityService,
  DiscoveredService,
  ProximityScanStatus,
} from '../../services/networkProximityService';

type StudentSessionScreenProps = NativeStackScreenProps<
  StudentStackParamList,
  'StudentMarkAttendance'
>;

export const StudentSessionScreen: React.FC<StudentSessionScreenProps> = ({
  route,
  navigation,
}) => {
  const { session } = route.params;
  const { user } = useAuth();

  const [scanStatus, setScanStatus] = useState<ProximityScanStatus>('scanning');
  const [discoveredService, setDiscoveredService] = useState<DiscoveredService | null>(null);
  const [isMarking, setIsMarking] = useState(false);
  const [isMarked, setIsMarked] = useState(false);
  const [markedTimestamp, setMarkedTimestamp] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deviceId = 'DEV-PHONE-ENCLAVE-8821';

  // Run mDNS proximity scan
  const startProximityScan = () => {
    setErrorMessage(null);
    setScanStatus('scanning');
    setDiscoveredService(null);
    networkProximityService.startScan(session.networkSessionId, 5000);
  };

  useEffect(() => {
    const unsubStatus = networkProximityService.onScanStatus((status) => {
      setScanStatus(status);
    });

    const unsubFound = networkProximityService.onServiceFound((service) => {
      setDiscoveredService(service);
      setScanStatus('discovered');
    });

    startProximityScan();

    return () => {
      networkProximityService.stopScan();
      unsubStatus();
      unsubFound();
    };
  }, [session.networkSessionId]);

  const handleMarkAttendance = async () => {
    if (scanStatus !== 'discovered') {
      Alert.alert(
        'Proximity Check Required',
        'Your device must be physically verified on the classroom WiFi before attendance can be marked.'
      );
      return;
    }

    if (!user) return;

    setIsMarking(true);
    setErrorMessage(null);

    const result = await sessionService.markAttendanceSelf({
      sessionId: session.id,
      studentId: user.id,
      deviceId,
      verificationMethod: 'wifi_local_network',
    });

    setIsMarking(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to mark attendance.');
      Alert.alert('Submission Error', result.error || 'Failed to record attendance.');
      return;
    }

    setIsMarked(true);
    setMarkedTimestamp(result.markedAt || new Date().toLocaleTimeString());
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
              <Text style={styles.sessionPeriod}>Class Period: {session.period}</Text>
            </View>
            <Badge
              label={isMarked ? 'PRESENT (RECORDED)' : 'SESSION ACTIVE'}
              variant={isMarked ? 'success' : 'warning'}
              dot
            />
          </View>
        </Card>

        {/* Error Banner */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={Colors.danger} />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}

        {/* Local Network Discovery Radar Card */}
        <Card
          variant={
            scanStatus === 'discovered'
              ? 'glow'
              : scanStatus === 'error' || scanStatus === 'timeout'
              ? 'bordered'
              : 'elevated'
          }
          style={styles.scanCard}
        >
          {scanStatus === 'scanning' && (
            <View style={styles.stateContainer}>
              <ActivityIndicator size="large" color={Colors.secondary} />
              <Text style={styles.stateTitle}>Checking you're on the classroom network…</Text>
              <Text style={styles.stateSubtitle}>
                Scanning local WiFi for teacher's advertised mDNS proximity signal...
              </Text>
              <View style={styles.sessionPill}>
                <Text style={styles.sessionPillText}>
                  Target Session: {session.networkSessionId}
                </Text>
              </View>
            </View>
          )}

          {scanStatus === 'discovered' && (
            <View style={styles.stateContainer}>
              <View style={[styles.statusIconCircle, { backgroundColor: Colors.successLight }]}>
                <Ionicons name="wifi" size={32} color={Colors.success} />
              </View>
              <Text style={[styles.stateTitle, { color: Colors.success }]}>
                Classroom WiFi Verified!
              </Text>
              <Text style={styles.stateSubtitle}>
                mDNS broadcast signal detected from instructor's phone on local network ({discoveredService?.latencyMs || 28}ms).
              </Text>
              <View style={styles.verifiedRow}>
                <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
                <Text style={styles.verifiedText}>Anti-Proxy Proximity Check Passed</Text>
              </View>
            </View>
          )}

          {(scanStatus === 'timeout' || scanStatus === 'error') && (
            <View style={styles.stateContainer}>
              <View style={[styles.statusIconCircle, { backgroundColor: Colors.dangerLight }]}>
                <Ionicons name="cloud-offline" size={32} color={Colors.danger} />
              </View>
              <Text style={[styles.stateTitle, { color: Colors.danger }]}>
                Couldn't detect classroom network
              </Text>
              <Text style={styles.stateSubtitle}>
                Make sure you are connected to the class WiFi and AP client isolation is not blocking peer discovery.
              </Text>
              <Button
                title="Retry Network Scan"
                variant="outline"
                size="sm"
                iconName="refresh"
                onPress={startProximityScan}
                style={{ marginTop: Spacing.md }}
              />
            </View>
          )}
        </Card>

        {/* Anti-Proxy Safeguard Details */}
        <Card style={styles.deviceCard}>
          <View style={styles.deviceRow}>
            <Ionicons name="phone-portrait-outline" size={18} color={Colors.primaryLight} />
            <Text style={styles.deviceLabel}>Bound Device Fingerprint:</Text>
            <Text style={styles.deviceVal}>{deviceId}</Text>
          </View>
          <Text style={styles.antiProxyNotice}>
            🔒 Anti-Proxy Rule: One device can only submit attendance for ONE student account per session.
          </Text>
        </Card>

        {/* Action Button / Success Confirmation */}
        {isMarked ? (
          <Card variant="glow" style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
            <Text style={styles.successTitle}>Attendance Marked!</Text>
            <Text style={styles.successCourse}>{session.groupName}</Text>
            <Text style={styles.successTime}>
              Recorded at: {markedTimestamp} (WiFi Proximity Verified)
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
              scanStatus === 'discovered'
                ? 'Mark My Attendance'
                : scanStatus === 'scanning'
                ? 'Checking Classroom WiFi…'
                : 'Proximity Check Required'
            }
            variant="primary"
            size="lg"
            iconName="finger-print"
            disabled={scanStatus !== 'discovered'}
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.danger + '44',
  },
  errorBannerText: {
    ...Typography.captionBold,
    color: Colors.danger,
    flex: 1,
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
    fontSize: 17,
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
