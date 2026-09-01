export const Colors = {
  // Brand / Theme
  primary: '#4F46E5', // Electric Indigo
  primaryLight: '#818CF8',
  primaryDark: '#3730A3',
  primaryGlow: 'rgba(79, 70, 229, 0.15)',

  secondary: '#06B6D4', // Cyan
  secondaryLight: '#67E8F9',
  secondaryDark: '#0891B2',

  // Status & Feedback
  success: '#10B981', // Emerald
  successLight: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B', // Amber
  warningLight: 'rgba(245, 158, 11, 0.15)',
  danger: '#EF4444', // Rose
  dangerLight: 'rgba(239, 68, 68, 0.15)',
  info: '#3B82F6', // Sky Blue

  // Neutrals / Dark Surface
  background: '#0B0F19', // Deep dark space background
  surface: '#111827', // Card surface
  surfaceElevated: '#1F2937', // Elevated component surface
  surfaceBorder: '#374151',
  surfaceBorderLight: '#1F2937',

  // Text
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textInverse: '#111827',

  // UI Accents
  divider: '#1F2937',
  cardOverlay: 'rgba(255, 255, 255, 0.03)',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  body: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  caption: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  captionBold: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  badge: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
};
