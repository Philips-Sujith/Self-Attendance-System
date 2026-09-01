import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'secondary' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
  dot = false,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: Colors.successLight, text: Colors.success, dot: Colors.success };
      case 'warning':
        return { bg: Colors.warningLight, text: Colors.warning, dot: Colors.warning };
      case 'danger':
        return { bg: Colors.dangerLight, text: Colors.danger, dot: Colors.danger };
      case 'info':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: Colors.info, dot: Colors.info };
      case 'secondary':
        return { bg: 'rgba(6, 182, 212, 0.15)', text: Colors.secondary, dot: Colors.secondary };
      case 'neutral':
        return { bg: Colors.surfaceBorder, text: Colors.textSecondary, dot: Colors.textMuted };
      case 'primary':
      default:
        return { bg: Colors.primaryGlow, text: Colors.primaryLight, dot: Colors.primaryLight };
    }
  };

  const colors = getColors();

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' ? styles.sizeSm : styles.sizeMd,
        { backgroundColor: colors.bg, borderColor: colors.text + '33' },
        style,
      ]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: colors.dot }]} />}
      <Text
        style={[
          styles.text,
          size === 'sm' ? styles.textSm : styles.textMd,
          { color: colors.text },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  sizeSm: {
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  sizeMd: {
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  text: {
    fontWeight: '600',
  },
  textSm: {
    fontSize: 11,
  },
  textMd: {
    fontSize: 12,
  },
});
