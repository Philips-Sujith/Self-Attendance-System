import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';

type StudentAuthScreenProps = NativeStackScreenProps<AuthStackParamList, 'StudentAuth'>;

export const StudentAuthScreen: React.FC<StudentAuthScreenProps> = ({ route, navigation }) => {
  const initialMode = route.params?.mode || 'login';
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const { loginAsStudent, isLoading } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [department, setDepartment] = useState('');
  const [classSection, setClassSection] = useState('');
  const [mobile, setMobile] = useState('');

  const handleSubmit = async () => {
    // In Stage 1: mock login/signup
    await loginAsStudent(email || 'alex.j@student.college.edu');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isLogin ? 'Student Login' : 'Student Registration'}
        subtitle="Self-Attendance & Course Groups"
        showBack
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, isLogin && styles.activeTab]}
              onPress={() => setIsLogin(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isLogin && styles.activeTabText]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, !isLogin && styles.activeTab]}
              onPress={() => setIsLogin(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>Register</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          {!isLogin && (
            <>
              <Input
                label="Full Name"
                placeholder="Alex Johnson"
                leftIcon="person-outline"
                value={name}
                onChangeText={setName}
              />
              <Input
                label="Roll Number / Student ID"
                placeholder="21CS1085"
                leftIcon="card-outline"
                autoCapitalize="characters"
                value={rollNo}
                onChangeText={setRollNo}
              />
              <Input
                label="Class / Section"
                placeholder="CSE - Section B (Semester 6)"
                leftIcon="layers-outline"
                value={classSection}
                onChangeText={setClassSection}
              />
              <Input
                label="Department"
                placeholder="Computer Science & Engineering"
                leftIcon="business-outline"
                value={department}
                onChangeText={setDepartment}
              />
              <Input
                label="Mobile Number"
                placeholder="+91 91234 56789"
                keyboardType="phone-pad"
                leftIcon="call-outline"
                value={mobile}
                onChangeText={setMobile}
              />
            </>
          )}

          <Input
            label="Student Email Address"
            placeholder="student@college.edu"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
            value={email}
            onChangeText={setEmail}
          />

          <Input
            label="Password"
            placeholder="••••••••"
            isPassword
            leftIcon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
          />

          <Button
            title={isLogin ? 'Sign In as Student' : 'Create Student Account'}
            variant="secondary"
            size="lg"
            loading={isLoading}
            onPress={handleSubmit}
            style={styles.submitBtn}
          />

          {/* Switch to Staff */}
          <View style={styles.bottomSwitch}>
            <Text style={styles.bottomText}>Are you a faculty member?</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('StaffAuth', { mode: 'login' })}
            >
              <Text style={styles.switchRoleLink}>Go to Staff Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    padding: Spacing.lg,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  activeTab: {
    backgroundColor: Colors.secondary,
  },
  tabText: {
    ...Typography.bodyBold,
    color: Colors.textMuted,
  },
  activeTabText: {
    color: Colors.textInverse,
  },
  submitBtn: {
    marginTop: Spacing.md,
  },
  bottomSwitch: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
    gap: Spacing.xs,
  },
  bottomText: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  switchRoleLink: {
    ...Typography.bodyBold,
    color: Colors.primaryLight,
  },
});
