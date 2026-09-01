import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StaffStackParamList, StaffTabParamList } from '../types/navigation';
import { StaffDashboardScreen } from '../screens/staff/StaffDashboardScreen';
import { StaffGroupDetailScreen } from '../screens/staff/StaffGroupDetailScreen';
import { StaffSessionScreen } from '../screens/staff/StaffSessionScreen';
import { StaffRosterScreen } from '../screens/staff/StaffRosterScreen';
import { StaffProfileScreen } from '../screens/staff/StaffProfileScreen';
import { Colors } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { RoleSwitcherBanner } from '../components/common/RoleSwitcherBanner';

const Tab = createBottomTabNavigator<StaffTabParamList>();
const Stack = createNativeStackNavigator<StaffStackParamList>();

const StaffBottomTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
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
      <RoleSwitcherBanner />
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
        <Stack.Screen name="StaffRoster" component={StaffRosterScreen} />
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
    height: 60,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
