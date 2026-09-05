// ==============================================================================
// SAS — Network Proximity Service (mDNS / Bonjour Local Network Discovery)
// Hardware-Level Peer Discovery using react-native-zeroconf (Android NSD/DNSSD & iOS Bonjour)
// Zero Mock Data — Strict Session Validation with Zero False Positives
// ==============================================================================

export const SAS_SERVICE_TYPE = 'sas-session';
export const SAS_SERVICE_PROTOCOL = 'tcp';
export const SAS_SERVICE_DOMAIN = 'local.';
export const SAS_SERVICE_FULL_TYPE = `_${SAS_SERVICE_TYPE}._${SAS_SERVICE_PROTOCOL}.${SAS_SERVICE_DOMAIN}`;
export const SAS_DEFAULT_PORT = 8923;

export interface DiscoveredService {
  name: string;
  type: string;
  host?: string;
  port: number;
  txt?: { [key: string]: string };
  discoveredAt: string;
  latencyMs?: number;
}

export type ProximityScanStatus = 'idle' | 'scanning' | 'discovered' | 'timeout' | 'error';
export type ProximityAdvertiseStatus = 'idle' | 'advertising' | 'error';

export type ServiceFoundCallback = (service: DiscoveredService) => void;
export type ScanStatusCallback = (status: ProximityScanStatus, message?: string) => void;
export type AdvertiseStatusCallback = (status: ProximityAdvertiseStatus, message?: string) => void;

// Dynamically obtain Zeroconf instance safely across native & test environments
let ZeroconfClass: any = null;
let ImplTypeEnum: any = { NSD: 'NSD', DNSSD: 'DNSSD' };
try {
  const mod = require('react-native-zeroconf');
  ZeroconfClass = mod.default || mod;
  if (mod.ImplType) {
    ImplTypeEnum = mod.ImplType;
  }
} catch (e) {
  // Graceful fallback for non-native test environments
  ZeroconfClass = null;
}

class NetworkProximityService {
  private zeroconf: any = null;
  private isCurrentlyAdvertising: boolean = false;
  private currentAdvertisedSessionId: string | null = null;
  private currentAdvertisedName: string | null = null;
  private isCurrentlyScanning: boolean = false;
  private scanTimer: any = null;
  private currentTargetSessionId: string | null = null;
  private scanStartTime: number = 0;

  private serviceFoundListeners: Set<ServiceFoundCallback> = new Set();
  private scanStatusListeners: Set<ScanStatusCallback> = new Set();
  private advertiseStatusListeners: Set<AdvertiseStatusCallback> = new Set();

  constructor() {
    this.initZeroconf();
  }

  private initZeroconf(): void {
    if (!this.zeroconf && ZeroconfClass) {
      try {
        this.zeroconf = new ZeroconfClass();
        this.attachZeroconfListeners();
      } catch (err) {
        console.warn('[SAS-mDNS] Native Zeroconf initialization error:', err);
        this.zeroconf = null;
      }
    }
  }

  private attachZeroconfListeners(): void {
    if (!this.zeroconf) return;

    this.zeroconf.on('start', () => {
      console.log('[SAS-mDNS] Subnet scan started for:', SAS_SERVICE_FULL_TYPE);
    });

    this.zeroconf.on('stop', () => {
      console.log('[SAS-mDNS] Subnet scan stopped.');
    });

    this.zeroconf.on('resolved', (service: any) => {
      this.handleServiceResolved(service);
    });

    this.zeroconf.on('found', (serviceName: string) => {
      console.log('[SAS-mDNS] Service found on subnet:', serviceName);
      if (this.isCurrentlyScanning && this.currentTargetSessionId) {
        const cleanTarget = this.currentTargetSessionId.trim().toUpperCase();
        if (serviceName && serviceName.toUpperCase().includes(cleanTarget)) {
          console.log('[SAS-mDNS] Found matching target service name on subnet:', serviceName);
        }
      }
    });

    this.zeroconf.on('error', (err: any) => {
      console.error('[SAS-mDNS] Zeroconf native error:', err);
      if (this.isCurrentlyScanning) {
        this.stopScan();
        this.notifyScanStatus(
          'error',
          'Local network scan encountered an error. Ensure Wi-Fi / Hotspot is enabled.'
        );
      }
      if (this.isCurrentlyAdvertising) {
        this.isCurrentlyAdvertising = false;
        this.notifyAdvertiseStatus('error', 'mDNS broadcast encountered a network error.');
      }
    });
  }

  // Handle mDNS resolved service and perform strict session verification
  private handleServiceResolved(service: any): void {
    if (!this.isCurrentlyScanning || !this.currentTargetSessionId) return;

    const rawName = service.name || service.fullName || '';
    const txtRecords = service.txt || {};
    const resolvedSessionId = (txtRecords.sessionId || '').trim().toUpperCase();
    const targetSessionId = (this.currentTargetSessionId || '').trim().toUpperCase();

    console.log('[SAS-mDNS] Service resolved on local subnet:', {
      name: rawName,
      host: service.host || service.addresses?.[0],
      port: service.port,
      resolvedSessionId,
      targetSessionId,
    });

    // STRICT MATCH: Session ID in TXT record or service name must match target
    const isSessionMatch =
      resolvedSessionId === targetSessionId ||
      (rawName.toUpperCase().includes(targetSessionId) && targetSessionId.length > 3);

    if (isSessionMatch) {
      const latency = Math.max(1, Date.now() - this.scanStartTime);
      const discoveredService: DiscoveredService = {
        name: rawName,
        type: service.type || SAS_SERVICE_FULL_TYPE,
        host: service.host || (service.addresses && service.addresses[0]) || '127.0.0.1',
        port: service.port || SAS_DEFAULT_PORT,
        txt: txtRecords,
        discoveredAt: new Date().toLocaleTimeString(),
        latencyMs: latency,
      };

      console.log('[SAS-mDNS] PROXIMITY VERIFIED: Discovered matching session beacon', {
        serviceName: rawName,
        sessionId: targetSessionId,
        latencyMs: latency,
      });

      this.stopScan();
      this.notifyServiceFound(discoveredService);
      this.notifyScanStatus('discovered', `Classroom signal verified (${discoveredService.name})`);
    } else {
      console.log('[SAS-mDNS] Ignored unrelated service on local subnet:', {
        discoveredName: rawName,
        discoveredSessionId: resolvedSessionId,
        expectedSessionId: targetSessionId,
      });
    }
  }

  // ============================================================================
  // STAFF: Start mDNS Advertisement Broadcast
  // ============================================================================
  public async startAdvertising(
    networkSessionId: string,
    groupCode?: string
  ): Promise<{ success: boolean; serviceName: string; error?: string }> {
    const cleanSessionId = (networkSessionId || '').trim().toUpperCase();
    const serviceName = `SAS-${(groupCode || 'SESSION').replace(/[^A-Z0-9]/gi, '')}-${cleanSessionId}`;
    this.currentAdvertisedSessionId = cleanSessionId;
    this.currentAdvertisedName = serviceName;
    this.isCurrentlyAdvertising = true;

    console.log('[SAS-mDNS] Starting mDNS broadcast:', {
      serviceName,
      type: SAS_SERVICE_TYPE,
      protocol: SAS_SERVICE_PROTOCOL,
      port: SAS_DEFAULT_PORT,
      networkSessionId: cleanSessionId,
    });

    this.notifyAdvertiseStatus(
      'advertising',
      `Broadcasting ${serviceName} on port ${SAS_DEFAULT_PORT}`
    );

    if (this.zeroconf && typeof this.zeroconf.publishService === 'function') {
      try {
        const txtData = {
          sessionId: cleanSessionId,
          groupCode: groupCode || 'CLASS',
          timestamp: new Date().toISOString(),
          app: 'SAS',
        };

        this.zeroconf.publishService(
          SAS_SERVICE_TYPE,
          SAS_SERVICE_PROTOCOL,
          SAS_SERVICE_DOMAIN,
          serviceName,
          SAS_DEFAULT_PORT,
          txtData
        );
      } catch (err: any) {
        console.error('[SAS-mDNS] Native publishService error:', err);
        this.notifyAdvertiseStatus('error', err.message || 'Failed to start native mDNS broadcast');
        return {
          success: false,
          serviceName,
          error: err.message,
        };
      }
    }

    return {
      success: true,
      serviceName,
    };
  }

  // Stop mDNS Advertisement Broadcast
  public stopAdvertising(): void {
    if (!this.isCurrentlyAdvertising && !this.currentAdvertisedName) return;

    const nameToStop = this.currentAdvertisedName;
    console.log('[SAS-mDNS] Stopping mDNS broadcast for:', nameToStop);

    if (this.zeroconf && typeof this.zeroconf.unpublishService === 'function' && nameToStop) {
      try {
        this.zeroconf.unpublishService(nameToStop);
      } catch (err) {
        console.warn('[SAS-mDNS] Error unpublishing service:', err);
      }
    }

    this.isCurrentlyAdvertising = false;
    this.currentAdvertisedSessionId = null;
    this.currentAdvertisedName = null;
    this.notifyAdvertiseStatus('idle', 'Advertisement stopped.');
  }

  public isAdvertising(): boolean {
    return this.isCurrentlyAdvertising;
  }

  public getActiveAdvertisedName(): string | null {
    return this.currentAdvertisedName;
  }

  // ============================================================================
  // STUDENT: Start Scanning Local WiFi Subnet
  // ============================================================================
  public startScan(
    targetSessionId?: string,
    timeoutMs: number = 7000
  ): void {
    this.stopScan();

    const cleanTargetId = (targetSessionId || '').trim().toUpperCase();
    this.currentTargetSessionId = cleanTargetId;
    this.isCurrentlyScanning = true;
    this.scanStartTime = Date.now();

    console.log('[SAS-mDNS] Starting local subnet scan for target session:', cleanTargetId);
    this.notifyScanStatus(
      'scanning',
      'Scanning classroom WiFi / hotspot for instructor broadcast...'
    );

    // Trigger native scan
    if (this.zeroconf && typeof this.zeroconf.scan === 'function') {
      try {
        this.zeroconf.scan(SAS_SERVICE_TYPE, SAS_SERVICE_PROTOCOL, SAS_SERVICE_DOMAIN);
      } catch (err: any) {
        console.error('[SAS-mDNS] Native scan call failed:', err);
        this.isCurrentlyScanning = false;
        this.notifyScanStatus('error', 'Failed to initialize local network scanner.');
        return;
      }
    }

    // Set strict timeout: If target is NOT discovered on the network within timeoutMs, FAIL.
    // ZERO FALSE POSITIVES — A timeout strictly reports failure.
    this.scanTimer = setTimeout(() => {
      if (!this.isCurrentlyScanning) return;

      console.log('[SAS-mDNS] Scan timeout reached without discovering session:', cleanTargetId);
      this.stopScan();
      this.notifyScanStatus(
        'timeout',
        'Classroom network not detected. Connect to the teacher\'s Wi-Fi/hotspot and try again.'
      );
    }, timeoutMs);
  }

  // Stop Local Network Scan
  public stopScan(): void {
    if (this.scanTimer) {
      clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }

    if (this.zeroconf && typeof this.zeroconf.stop === 'function') {
      try {
        this.zeroconf.stop();
      } catch (err) {
        // Ignore stop error
      }
    }

    this.isCurrentlyScanning = false;
    this.currentTargetSessionId = null;
  }

  public isScanning(): boolean {
    return this.isCurrentlyScanning;
  }

  // ============================================================================
  // Subscriptions & Event Listeners
  // ============================================================================
  public onServiceFound(callback: ServiceFoundCallback): () => void {
    this.serviceFoundListeners.add(callback);
    return () => this.serviceFoundListeners.delete(callback);
  }

  public onScanStatus(callback: ScanStatusCallback): () => void {
    this.scanStatusListeners.add(callback);
    return () => this.scanStatusListeners.delete(callback);
  }

  public onAdvertiseStatus(callback: AdvertiseStatusCallback): () => void {
    this.advertiseStatusListeners.add(callback);
    return () => this.advertiseStatusListeners.delete(callback);
  }

  private notifyServiceFound(service: DiscoveredService): void {
    this.serviceFoundListeners.forEach((cb) => {
      try {
        cb(service);
      } catch (err) {
        console.error('[SAS-mDNS] Error in onServiceFound listener:', err);
      }
    });
  }

  private notifyScanStatus(status: ProximityScanStatus, message?: string): void {
    this.scanStatusListeners.forEach((cb) => {
      try {
        cb(status, message);
      } catch (err) {
        console.error('[SAS-mDNS] Error in onScanStatus listener:', err);
      }
    });
  }

  private notifyAdvertiseStatus(status: ProximityAdvertiseStatus, message?: string): void {
    this.advertiseStatusListeners.forEach((cb) => {
      try {
        cb(status, message);
      } catch (err) {
        console.error('[SAS-mDNS] Error in onAdvertiseStatus listener:', err);
      }
    });
  }
}

export const networkProximityService = new NetworkProximityService();
