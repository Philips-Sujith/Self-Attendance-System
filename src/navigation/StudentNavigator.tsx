import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StudentStackParamList, StudentTabParamList } from '../types/navigation';
import { StudentDashboardScreen } from '../screens/student/StudentDashboardScreen';
import { StudentJoinGroupScreen } from '../screens/student/StudentJoinGroupScreen';
import { StudentSessionScreen } from '../screens/student/StudentSessionScreen';
import { StudentProfileScreen } from '../screens/student/StudentProfileScreen';
import { NetworkTestScreen } from '../screens/shared/NetworkTestScreen';
import { Colors } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator<StudentTabParamList>();
const Stack = createNativeStackNavigator<StudentStackParamList>();

const StudentBottomTabs: React.FC = () => {
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
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="StudentCoursesTab"
        component={StudentDashboardScreen}
        options={{
          tabBarLabel: 'My Courses',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="StudentProfileTab"
        component={StudentProfileScreen}
        options={{
          tabBarLabel: 'Student Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const StudentNavigator: React.FC = () => {
  return (
    <View style={styles.container}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="StudentTabs" component={StudentBottomTabs} />
        <Stack.Screen name="StudentJoinGroup" component={StudentJoinGroupScreen} />
        <Stack.Screen name="StudentMarkAttendance" component={StudentSessionScreen} />
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
