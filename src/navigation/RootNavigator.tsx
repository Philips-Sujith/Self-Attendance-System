// ==============================================================================
// SAS — Root Navigation Container
// Strictly Routes Based on Authenticated User Role from Supabase
// ==============================================================================

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { AuthNavigator } from './AuthNavigator';
import { StaffNavigator } from './StaffNavigator';
import { StudentNavigator } from './StudentNavigator';
import { useAuth } from '../context/AuthContext';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();

  // Show clean branded splash screen while resolving Supabase session & user role
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoBadge}>
          <Ionicons name="finger-print" size={44} color={Colors.primaryLight} />
        </View>
        <Text style={styles.loadingTitle}>SAS</Text>
        <Text style={styles.loadingSub}>Self Attendance System</Text>
        <ActivityIndicator size="small" color={Colors.primaryLight} style={styles.spinner} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'fade',
        }}
      >
        {!user ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : user.role === 'staff' ? (
          <Stack.Screen name="Staff" component={StaffNavigator} />
        ) : (
          <Stack.Screen name="Student" component={StudentNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight + '55',
  },
  loadingTitle: {
    ...Typography.h1,
    fontSize: 28,
    color: Colors.text,
  },
  loadingSub: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  spinner: {
    marginTop: Spacing.xl,
  },
});
