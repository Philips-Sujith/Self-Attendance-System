import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types/navigation';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { StaffAuthScreen } from '../screens/auth/StaffAuthScreen';
import { StudentAuthScreen } from '../screens/auth/StudentAuthScreen';
import { Colors } from '../constants/theme';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="StaffAuth" component={StaffAuthScreen} />
      <Stack.Screen name="StudentAuth" component={StudentAuthScreen} />
    </Stack.Navigator>
  );
};
