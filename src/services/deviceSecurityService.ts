// ==============================================================================
// SAS — Device Security & Anti-Proxy Fingerprinting Service (§5)
// Persistent device binding to prevent multiple student attendance marks from one device
// ==============================================================================

import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'sas_device_enclave_fingerprint_v1';

export const deviceSecurityService = {
  // Retrieve or generate a permanent hardware/enclave device ID
  getOrCreatePersistentDeviceId: async (): Promise<string> => {
    if (Platform.OS === 'web') {
      try {
        let webId = typeof localStorage !== 'undefined' ? localStorage.getItem(DEVICE_ID_KEY) : null;
        if (!webId) {
          webId = 'SAS-WEB-' + Math.random().toString(36).substring(2, 10).toUpperCase();
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(DEVICE_ID_KEY, webId);
          }
        }
        return webId;
      } catch (e) {
        return 'SAS-WEB-' + Date.now().toString(36).toUpperCase();
      }
    }

    try {
      // 1. Check existing locked SecureStore fingerprint
      let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
      if (deviceId) {
        return deviceId;
      }

      // 2. Generate new hardware-tied identifier
      let vendorId = '';
      if (Platform.OS === 'ios') {
        vendorId = (await Application.getIosIdForVendorAsync()) || '';
      } else if (Platform.OS === 'android') {
        vendorId = Application.getAndroidId() || '';
      }

      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const cleanVendor = vendorId ? vendorId.slice(0, 8).toUpperCase() : randomSuffix;

      deviceId = `SAS-DEV-${Platform.OS.toUpperCase()}-${cleanVendor}`;

      // 3. Persist permanently in SecureStore
      await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
      return deviceId;
    } catch (e) {
      console.warn('SecureStore deviceId fetch fallback:', e);
      return `SAS-DEV-${Platform.OS.toUpperCase()}-8821`;
    }
  },

  // Get device diagnostic audit details
  getDeviceAuditDetails: async (): Promise<{
    deviceId: string;
    os: string;
    appVersion: string;
  }> => {
    const deviceId = await deviceSecurityService.getOrCreatePersistentDeviceId();
    const appVersion = Application.nativeApplicationVersion || '1.0.0';

    return {
      deviceId,
      os: `${Platform.OS} (${Platform.Version})`,
      appVersion,
    };
  },
};
