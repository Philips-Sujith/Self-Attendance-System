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
import { Ionicons } from '@expo/vector-icons';

type StaffAuthScreenProps = NativeStackScreenProps<AuthStackParamList, 'StaffAuth'>;

export const StaffAuthScreen: React.FC<StaffAuthScreenProps> = ({ route, navigation }) => {
  const initialMode = route.params?.mode || 'login';
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const { loginAsStaff, isLoading } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [staffId, setStaffId] = useState('');
  const [department, setDepartment] = useState('');
  const [mobile, setMobile] = useState('');

  const handleSubmit = async () => {
    // In Stage 1: mock login/signup
    await loginAsStaff(email || 'sujith.philips@college.edu');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isLogin ? 'Staff Login' : 'Staff Registration'}
        subtitle="Faculty & Course Instructors"
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
                placeholder="Dr. Sujith Philips"
                leftIcon="person-outline"
                value={name}
                onChangeText={setName}
              />
              <Input
                label="Staff / Faculty ID"
                placeholder="CSE-FAC-104"
                leftIcon="id-card-outline"
                value={staffId}
                onChangeText={setStaffId}
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
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
                leftIcon="call-outline"
                value={mobile}
                onChangeText={setMobile}
              />
            </>
          )}

          <Input
            label="College Email Address"
            placeholder="staff@college.edu"
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
            title={isLogin ? 'Sign In as Staff' : 'Create Staff Account'}
            variant="primary"
            size="lg"
            loading={isLoading}
            onPress={handleSubmit}
            style={styles.submitBtn}
          />

          {/* Switch to Student */}
          <View style={styles.bottomSwitch}>
            <Text style={styles.bottomText}>Are you a student?</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('StudentAuth', { mode: 'login' })}
            >
              <Text style={styles.switchRoleLink}>Go to Student Login</Text>
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
    backgroundColor: Colors.primary,
  },
  tabText: {
    ...Typography.bodyBold,
    color: Colors.textMuted,
  },
  activeTabText: {
    color: Colors.white,
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
    color: Colors.secondary,
  },
});
