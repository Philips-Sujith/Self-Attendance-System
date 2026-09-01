// Environment configuration for SAS

export const ENV = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  isSupabaseConfigured: (): boolean => {
    return (
      !!process.env.EXPO_PUBLIC_SUPABASE_URL &&
      !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.EXPO_PUBLIC_SUPABASE_URL.includes('your-project-id')
    );
  },
};
