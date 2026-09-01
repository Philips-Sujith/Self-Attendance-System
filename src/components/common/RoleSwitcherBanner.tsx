import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, BorderRadius, Spacing, Typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export const RoleSwitcherBanner: React.FC = () => {
  const { user, switchRole, logout } = useAuth();

  if (!user) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.leftInfo}>
        <View
          style={[
            styles.rolePill,
            user.role === 'staff' ? styles.staffPill : styles.studentPill,
          ]}
        >
          <Ionicons
            name={user.role === 'staff' ? 'school' : 'person'}
            size={12}
            color={user.role === 'staff' ? Colors.primaryLight : Colors.secondary}
          />
          <Text
            style={[
              styles.roleText,
              user.role === 'staff' ? styles.staffText : styles.studentText,
            ]}
          >
            {user.role.toUpperCase()} MODE
          </Text>
        </View>
        <Text style={styles.userName} numberOfLines={1}>
          {user.name}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.switchBtn}
          onPress={() => switchRole(user.role === 'staff' ? 'student' : 'staff')}
          activeOpacity={0.7}
        >
          <Ionicons name="swap-horizontal" size={14} color={Colors.white} />
          <Text style={styles.switchBtnText}>
            Switch to {user.role === 'staff' ? 'Student' : 'Staff'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={16} color={Colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.xs,
  },
  staffPill: {
    backgroundColor: Colors.primaryGlow,
  },
  studentPill: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 3,
  },
  staffText: {
    color: Colors.primaryLight,
  },
  studentText: {
    color: Colors.secondary,
  },
  userName: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.xs,
  },
  switchBtnText: {
    fontSize: 11,
    color: Colors.white,
    marginLeft: 4,
    fontWeight: '500',
  },
  logoutBtn: {
    padding: 4,
  },
});
