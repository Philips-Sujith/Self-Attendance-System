// ==============================================================================
// SAS — Environment Configuration & Production Credentials
// Single Source of Truth for Supabase Backend Connection
// ==============================================================================

const DEFAULT_SUPABASE_URL = 'https://iubzbdajgxbxhsbwgytr.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_s4F15jHOveZmN5Nnv55dUg_Bw2axQSY';

export const ENV = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY,
  
  // Safe diagnostic string (exposes only hostname/ref for verification, NEVER the full key)
  getDiagnosticInfo: () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
    let hostname = 'unknown';
    try {
      hostname = new URL(url).hostname;
    } catch {
      hostname = url.split('/')[2] || url;
    }
    return {
      supabaseHost: hostname,
      isConfigured: true,
    };
  },
};
