import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { deviceSecurityService } from '../../services/deviceSecurityService';

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

  // Session & Database State
  const [isSessionActive, setIsSessionActive] = useState<boolean>(session.status === 'active');
  const [sessionClosedReason, setSessionClosedReason] = useState<string | null>(null);

  // Countdown Timer
  const calculateRemainingSeconds = useCallback(() => {
    const diff = Math.floor((new Date(session.endTime).getTime() - Date.now()) / 1000);
    return Math.max(0, diff > 0 ? diff : session.durationMinutes * 60);
  }, [session.endTime, session.durationMinutes]);

  const [secondsRemaining, setSecondsRemaining] = useState<number>(calculateRemainingSeconds);

  // Network Discovery & Attendance State Machine
  const [scanStatus, setScanStatus] = useState<ProximityScanStatus>('scanning');
  const [discoveredService, setDiscoveredService] = useState<DiscoveredService | null>(null);
  const [isMarking, setIsMarking] = useState(false);
  const [isMarked, setIsMarked] = useState(false);
  const [markedTimestamp, setMarkedTimestamp] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string>('Loading...');

  // 1. Fetch persistent device fingerprint on mount
  useEffect(() => {
    deviceSecurityService.getOrCreatePersistentDeviceId().then((id) => {
      setDeviceId(id);
    });
  }, []);

  // 2. Database as Single Source of Truth — verify session active on mount
  useEffect(() => {
    let isMounted = true;
    sessionService.verifySessionActive(session.id).then((result) => {
      if (!isMounted) return;
      if (!result.isActive) {
        setIsSessionActive(false);
        setSessionClosedReason(result.reason || 'This attendance session has ended.');
        setScanStatus('error');
        networkProximityService.stopScan();
      }
    });

    // Subscribe to real-time session status updates from Supabase
    const unsubscribeRealtime = sessionService.subscribeToSessionAttendance(session.id, () => {
      sessionService.verifySessionActive(session.id).then((fresh) => {
        if (!isMounted) return;
        if (!fresh.isActive) {
          setIsSessionActive(false);
          setSessionClosedReason(fresh.reason || 'Session closed by instructor.');
          networkProximityService.stopScan();
        }
      });
    });

    return () => {
      isMounted = false;
      unsubscribeRealtime();
    };
  }, [session.id]);

  // 3. Countdown timer with auto-close when timer expires
  useEffect(() => {
    if (!isSessionActive || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsSessionActive(false);
          setSessionClosedReason('Attendance session time window has expired.');
          networkProximityService.stopScan();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSessionActive, secondsRemaining]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 4. Run mDNS local network proximity scan
  const startProximityScan = useCallback(() => {
    if (!isSessionActive) return;

    setErrorMessage(null);
    setScanStatus('scanning');
    setDiscoveredService(null);
    networkProximityService.startScan(session.networkSessionId, 7000);
  }, [isSessionActive, session.networkSessionId]);

  useEffect(() => {
    if (!isSessionActive) return;

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
  }, [isSessionActive, session.networkSessionId, startProximityScan]);

  // 5. Submit attendance with multi-layer verification
  const handleMarkAttendance = async () => {
    if (!isSessionActive) {
      Alert.alert('Session Closed', 'This attendance session has already closed or expired.');
      return;
    }

    if (scanStatus !== 'discovered') {
      Alert.alert(
        'Proximity Check Required',
        'Your device must be physically verified on the classroom local network before attendance can be marked.'
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
      Alert.alert('Attendance Submission', result.error || 'Failed to record attendance.');
      return;
    }

    setIsMarked(true);
    setMarkedTimestamp(result.markedAt || new Date().toLocaleTimeString());
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={session.groupCode || 'Attendance Session'}
        subtitle={`Class Period: ${session.period}`}
        showBack
      />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Session Overview Card */}
        <Card variant="elevated" style={styles.overviewCard}>
          <View style={styles.sessionHeaderRow}>
            <View>
              <Text style={styles.sessionCourseName}>{session.groupName || session.groupCode}</Text>
              <Text style={styles.sessionDate}>{session.date} • Period {session.period}</Text>
            </View>
            <View style={styles.timerBadgeBox}>
              <Badge
                label={
                  isMarked
                    ? 'PRESENT'
                    : isSessionActive
                    ? `LIVE • ${formatTimer(secondsRemaining)}`
                    : 'CLOSED'
                }
                variant={isMarked ? 'success' : isSessionActive ? 'warning' : 'neutral'}
                dot
              />
            </View>
          </View>
        </Card>

        {/* Error Banner */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={Colors.danger} />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}

        {/* SESSION CLOSED STATE */}
        {!isSessionActive ? (
          <Card variant="bordered" style={styles.closedCard}>
            <View style={[styles.statusIconCircle, { backgroundColor: Colors.dangerLight }]}>
              <Ionicons name="lock-closed" size={28} color={Colors.danger} />
            </View>
            <Text style={[styles.stateTitle, { color: Colors.danger }]}>
              Attendance Closed
            </Text>
            <Text style={styles.stateSubtitle}>
              {sessionClosedReason || 'This session has ended.'}
            </Text>
            <Button
              title="Return to Dashboard"
              variant="secondary"
              size="md"
              onPress={() => navigation.goBack()}
              style={{ marginTop: Spacing.md, width: '100%' }}
            />
          </Card>
        ) : isMarked ? (
          /* ATTENDANCE MARKED SUCCESS CONFIRMATION */
          <Card variant="glow" style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={44} color={Colors.success} />
            <Text style={styles.successTitle}>Attendance Marked</Text>
            <Text style={styles.successCourse}>{session.groupName}</Text>
            <Text style={styles.successTime}>
              Recorded at: {markedTimestamp}
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
          /* LOCAL NETWORK PROXIMITY VERIFICATION */
          <>
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
                  <Text style={styles.stateTitle}>Checking classroom network...</Text>
                  <Text style={styles.stateSubtitle}>
                    Scanning local Wi-Fi / hotspot for instructor's session...
                  </Text>
                </View>
              )}

              {scanStatus === 'discovered' && (
                <View style={styles.stateContainer}>
                  <View style={[styles.statusIconCircle, { backgroundColor: Colors.successLight }]}>
                    <Ionicons name="wifi" size={28} color={Colors.success} />
                  </View>
                  <Text style={[styles.stateTitle, { color: Colors.success }]}>
                    Classroom network verified
                  </Text>
                  <Text style={styles.stateSubtitle}>
                    Instructor's session active on local network.
                  </Text>
                </View>
              )}

              {(scanStatus === 'timeout' || scanStatus === 'error') && (
                <View style={styles.stateContainer}>
                  <View style={[styles.statusIconCircle, { backgroundColor: Colors.dangerLight }]}>
                    <Ionicons name="cloud-offline" size={28} color={Colors.danger} />
                  </View>
                  <Text style={[styles.stateTitle, { color: Colors.danger }]}>
                    Classroom network not detected
                  </Text>
                  <Text style={styles.stateSubtitle}>
                    Connect to the teacher's Wi-Fi/hotspot and retry.
                  </Text>
                  <Button
                    title="Retry Network Scan"
                    variant="outline"
                    size="sm"
                    iconName="refresh"
                    onPress={startProximityScan}
                    style={{ marginTop: Spacing.sm }}
                  />
                </View>
              )}
            </Card>

            {/* Action Button */}
            <Button
              title={
                !isSessionActive
                  ? 'Session Closed'
                  : scanStatus === 'discovered'
                  ? 'Mark My Attendance'
                  : scanStatus === 'scanning'
                  ? 'Checking Classroom Network...'
                  : 'Classroom Network Required'
              }
              variant="primary"
              size="lg"
              iconName="finger-print"
              disabled={!isSessionActive || scanStatus !== 'discovered' || isMarking}
              loading={isMarking}
              onPress={handleMarkAttendance}
              style={styles.markButton}
            />
          </>
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
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  overviewCard: {
    padding: Spacing.md,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionCourseName: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.text,
  },
  sessionDate: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  timerBadgeBox: {
    alignItems: 'flex-end',
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
    padding: Spacing.lg,
    alignItems: 'center',
  },
  closedCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
    borderColor: Colors.danger + '33',
  },
  stateContainer: {
    alignItems: 'center',
    gap: 4,
  },
  statusIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  stateTitle: {
    ...Typography.h2,
    fontSize: 16,
    textAlign: 'center',
  },
  stateSubtitle: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 2,
  },
  markButton: {
    marginTop: Spacing.xs,
  },
  successCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.surfaceElevated,
  },
  successTitle: {
    ...Typography.h1,
    fontSize: 20,
    color: Colors.success,
    marginTop: Spacing.xs,
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
