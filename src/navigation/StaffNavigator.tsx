import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StaffStackParamList, StaffTabParamList } from '../types/navigation';
import { StaffDashboardScreen } from '../screens/staff/StaffDashboardScreen';
import { StaffGroupDetailScreen } from '../screens/staff/StaffGroupDetailScreen';
import { StaffSessionScreen } from '../screens/staff/StaffSessionScreen';
import { StaffRosterScreen } from '../screens/staff/StaffRosterScreen';
import { StaffProfileScreen } from '../screens/staff/StaffProfileScreen';
import { StaffReportsScreen } from '../screens/staff/StaffReportsScreen';
import { NetworkTestScreen } from '../screens/shared/NetworkTestScreen';
import { Colors } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator<StaffTabParamList>();
const Stack = createNativeStackNavigator<StaffStackParamList>();

const StaffBottomTabs: React.FC = () => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          height: 56 + bottomInset,
          paddingBottom: bottomInset,
        },
        tabBarActiveTintColor: Colors.primaryLight,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="StaffGroupsTab"
        component={StaffDashboardScreen}
        options={{
          tabBarLabel: 'Course Groups',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="StaffProfileTab"
        component={StaffProfileScreen}
        options={{
          tabBarLabel: 'Staff Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const StaffNavigator: React.FC = () => {
  return (
    <View style={styles.container}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="StaffTabs" component={StaffBottomTabs} />
        <Stack.Screen name="StaffGroupDetail" component={StaffGroupDetailScreen} />
        <Stack.Screen name="StaffSessionLive" component={StaffSessionScreen} />
        <Stack.Screen name="StaffSessionReport" component={StaffReportsScreen} />
        <Stack.Screen name="StaffRoster" component={StaffRosterScreen} />
        <Stack.Screen name="NetworkTest" component={NetworkTestScreen} />
      </Stack.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
