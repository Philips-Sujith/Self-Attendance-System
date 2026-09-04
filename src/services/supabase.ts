import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../config/env';

// In-memory fallback map for Node.js / Jest test environments
const memoryStore = new Map<string, string>();

const isNodeEnv = typeof window === 'undefined' && (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');

export const StorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (isNodeEnv) {
      return memoryStore.get(key) || null;
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return memoryStore.get(key) || null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isNodeEnv) {
      memoryStore.set(key, value);
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      memoryStore.set(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (isNodeEnv) {
      memoryStore.delete(key);
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      memoryStore.delete(key);
    }
  },
};

const supabaseUrl = ENV.SUPABASE_URL;
const supabaseAnonKey = ENV.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase configuration missing: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be provided.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: StorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});


