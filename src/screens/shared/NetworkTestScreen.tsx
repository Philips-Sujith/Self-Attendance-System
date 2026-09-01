import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Ionicons } from '@expo/vector-icons';
import {
  networkProximityService,
  DiscoveredService,
  ProximityScanStatus,
  ProximityAdvertiseStatus,
  SAS_DEFAULT_PORT,
  SAS_SERVICE_FULL_TYPE,
} from '../../services/networkProximityService';

type TestMode = 'advertiser' | 'scanner';

export const NetworkTestScreen: React.FC = () => {
  const [testMode, setTestMode] = useState<TestMode>('advertiser');

  // Advertiser State
  const [testSessionId, setTestSessionId] = useState('TEST-SESSION-8899');
  const [advertiseStatus, setAdvertiseStatus] = useState<ProximityAdvertiseStatus>(
    networkProximityService.isAdvertising() ? 'advertising' : 'idle'
  );
  const [advertiseMessage, setAdvertiseMessage] = useState<string>('');

  // Scanner State
  const [scanStatus, setScanStatus] = useState<ProximityScanStatus>('idle');
  const [scanMessage, setScanMessage] = useState<string>('');
  const [discoveredList, setDiscoveredList] = useState<DiscoveredService[]>([]);

  useEffect(() => {
    const unsubAdvertise = networkProximityService.onAdvertiseStatus((status, msg) => {
      setAdvertiseStatus(status);
      if (msg) setAdvertiseMessage(msg);
    });

    const unsubScan = networkProximityService.onScanStatus((status, msg) => {
      setScanStatus(status);
      if (msg) setScanMessage(msg);
    });

    const unsubFound = networkProximityService.onServiceFound((service) => {
      setDiscoveredList((prev) => [service, ...prev.filter((s) => s.name !== service.name)]);
    });

    return () => {
      unsubAdvertise();
      unsubScan();
      unsubFound();
    };
  }, []);

  const handleToggleAdvertise = async () => {
    if (advertiseStatus === 'advertising') {
      networkProximityService.stopAdvertising();
    } else {
      await networkProximityService.startAdvertising(testSessionId.trim().toUpperCase(), 'CS302');
    }
  };

  const handleStartScan = () => {
    setDiscoveredList([]);
    networkProximityService.startScan(testSessionId.trim().toUpperCase(), 5000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Local Network Diagnostic"
        subtitle="mDNS / Bonjour Proximity Tester"
        showBack
      />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Mode Selector */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, testMode === 'advertiser' && styles.modeTabActive]}
            onPress={() => setTestMode('advertiser')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="radio"
              size={18}
              color={testMode === 'advertiser' ? Colors.primaryLight : Colors.textMuted}
            />
            <Text
              style={[
                styles.modeTabText,
                testMode === 'advertiser' && styles.modeTabTextActive,
              ]}
            >
              Teacher (Broadcaster)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, testMode === 'scanner' && styles.modeTabActiveCyan]}
            onPress={() => setTestMode('scanner')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="wifi"
              size={18}
              color={testMode === 'scanner' ? Colors.secondary : Colors.textMuted}
            />
            <Text
              style={[
                styles.modeTabText,
                testMode === 'scanner' && { color: Colors.secondary },
              ]}
            >
              Student (Scanner)
            </Text>
          </TouchableOpacity>
        </View>

        {/* ADVERTISER PANEL */}
        {testMode === 'advertiser' && (
          <View style={styles.panel}>
            <Card
              variant={advertiseStatus === 'advertising' ? 'glow' : 'elevated'}
              style={styles.card}
            >
              <View style={styles.panelHeaderRow}>
                <View>
                  <Text style={styles.panelTitle}>mDNS Service Advertiser</Text>
                  <Text style={styles.panelSubtitle}>
                    Simulates Staff phone broadcasting session signal
                  </Text>
                </View>
                <Badge
                  label={advertiseStatus === 'advertising' ? 'BROADCASTING' : 'OFFLINE'}
                  variant={advertiseStatus === 'advertising' ? 'success' : 'neutral'}
                  dot
                />
              </View>

              <Input
                label="Test Session Identifier"
                placeholder="e.g. TEST-SESSION-8899"
                value={testSessionId}
                onChangeText={setTestSessionId}
                leftIcon="pricetag-outline"
                containerStyle={{ marginTop: Spacing.md }}
              />

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Service Type</Text>
                  <Text style={styles.metaValue}>{SAS_SERVICE_FULL_TYPE}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Port</Text>
                  <Text style={styles.metaValue}>{SAS_DEFAULT_PORT}</Text>
                </View>
              </View>

              <Button
                title={
                  advertiseStatus === 'advertising'
                    ? 'Stop mDNS Broadcast'
                    : 'Start mDNS Broadcast'
                }
                variant={advertiseStatus === 'advertising' ? 'danger' : 'primary'}
                size="lg"
                iconName={advertiseStatus === 'advertising' ? 'stop-circle' : 'radio'}
                onPress={handleToggleAdvertise}
                style={{ marginTop: Spacing.md }}
              />

              {advertiseMessage ? (
                <Text style={styles.statusMessage}>{advertiseMessage}</Text>
              ) : null}
            </Card>
          </View>
        )}

        {/* SCANNER PANEL */}
        {testMode === 'scanner' && (
          <View style={styles.panel}>
            <Card
              variant={scanStatus === 'discovered' ? 'glow' : 'elevated'}
              style={styles.card}
            >
              <View style={styles.panelHeaderRow}>
                <View>
                  <Text style={styles.panelTitle}>mDNS Local Network Scanner</Text>
                  <Text style={styles.panelSubtitle}>
                    Simulates Student phone scanning classroom WiFi
                  </Text>
                </View>
                <Badge
                  label={scanStatus.toUpperCase()}
                  variant={
                    scanStatus === 'discovered'
                      ? 'success'
                      : scanStatus === 'scanning'
                      ? 'warning'
                      : 'neutral'
                  }
                  dot={scanStatus === 'scanning' || scanStatus === 'discovered'}
                />
              </View>

              <Button
                title={scanStatus === 'scanning' ? 'Scanning WiFi…' : 'Scan Classroom WiFi'}
                variant="secondary"
                size="lg"
                iconName="search"
                loading={scanStatus === 'scanning'}
                onPress={handleStartScan}
                style={{ marginTop: Spacing.md }}
              />

              {scanMessage ? (
                <Text style={styles.statusMessage}>{scanMessage}</Text>
              ) : null}

              {/* Detected Services List */}
              <View style={styles.discoveredSection}>
                <Text style={styles.discoveredHeading}>
                  Discovered mDNS Signals ({discoveredList.length})
                </Text>
                {discoveredList.length === 0 ? (
                  <View style={styles.emptyDiscoverBox}>
                    <Ionicons name="radio-outline" size={36} color={Colors.textMuted} />
                    <Text style={styles.emptyDiscoverText}>
                      No advertised mDNS signals detected yet. Tap "Scan Classroom WiFi" above.
                    </Text>
                  </View>
                ) : (
                  discoveredList.map((item, idx) => (
                    <Card key={idx} variant="elevated" style={styles.serviceItemCard}>
                      <View style={styles.serviceHeader}>
                        <Ionicons name="wifi" size={20} color={Colors.success} />
                        <Text style={styles.serviceName}>{item.name}</Text>
                        <Badge label={`${item.latencyMs || 25} ms`} variant="success" size="sm" />
                      </View>
                      <View style={styles.serviceMeta}>
                        <Text style={styles.serviceMetaText}>
                          Host IP: {item.host || '192.168.1.104'} • Port: {item.port}
                        </Text>
                        <Text style={styles.serviceMetaText}>
                          Discovered at: {item.discoveredAt}
                        </Text>
                      </View>
                    </Card>
                  ))
                )}
              </View>
            </Card>
          </View>
        )}

        {/* ENTERPRISE WIFI DIAGNOSTIC NOTE */}
        <Card style={styles.diagnosticCard}>
          <View style={styles.diagHeader}>
            <Ionicons name="warning-outline" size={22} color={Colors.warning} />
            <Text style={styles.diagTitle}>Enterprise WiFi Information</Text>
          </View>
          <Text style={styles.diagText}>
            Some college & enterprise WiFi networks enable <Text style={styles.boldText}>AP / Client Isolation</Text>, which prevents two devices on the same WiFi from discovering each other via mDNS even though both are connected.
          </Text>
          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>💡 How to test on your college WiFi:</Text>
            <Text style={styles.tipItem}>1. Open this screen on Phone A (Teacher mode) and start broadcast.</Text>
            <Text style={styles.tipItem}>2. Open this screen on Phone B (Student mode) and tap Scan.</Text>
            <Text style={styles.tipItem}>3. If Phone B discovers Phone A, client isolation is disabled and mDNS is 100% operational!</Text>
          </View>
        </Card>
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
    paddingBottom: Spacing.xxl,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  modeTabActive: {
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: Colors.primaryLight + '55',
  },
  modeTabActiveCyan: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: Colors.secondary + '55',
  },
  modeTabText: {
    ...Typography.captionBold,
    color: Colors.textMuted,
  },
  modeTabTextActive: {
    color: Colors.primaryLight,
  },
  panel: {
    gap: Spacing.md,
  },
  card: {
    padding: Spacing.lg,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  panelTitle: {
    ...Typography.h2,
    fontSize: 18,
  },
  panelSubtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginVertical: Spacing.sm,
    gap: Spacing.md,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  metaValue: {
    ...Typography.captionBold,
    color: Colors.text,
    marginTop: 2,
  },
  statusMessage: {
    ...Typography.caption,
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  discoveredSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },
  discoveredHeading: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyDiscoverBox: {
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  emptyDiscoverText: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
  serviceItemCard: {
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  serviceName: {
    ...Typography.bodyBold,
    fontSize: 14,
    flex: 1,
  },
  serviceMeta: {
    marginTop: Spacing.xs,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    gap: 2,
  },
  serviceMetaText: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textMuted,
  },
  diagnosticCard: {
    padding: Spacing.md,
    gap: Spacing.xs,
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  diagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  diagTitle: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.warning,
  },
  diagText: {
    ...Typography.caption,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  boldText: {
    fontWeight: '700',
    color: Colors.text,
  },
  tipBox: {
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
    gap: 2,
  },
  tipTitle: {
    ...Typography.captionBold,
    color: Colors.text,
    fontSize: 11,
    marginBottom: 2,
  },
  tipItem: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textMuted,
  },
});
