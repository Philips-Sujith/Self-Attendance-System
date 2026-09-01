import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const { signIn, signUpStaff, isLoading } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [staffId, setStaffId] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [mobile, setMobile] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password.trim() || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (isLogin) {
      const result = await signIn(email.trim(), password);
      if (!result.success) {
        setErrorMessage(result.error || 'Login failed. Check your credentials.');
      }
    } else {
      if (!name.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (!staffId.trim()) {
        setErrorMessage('Please enter your Staff / Faculty ID.');
        return;
      }

      const result = await signUpStaff({
        email: email.trim(),
        password,
        name: name.trim(),
        staffId: staffId.trim(),
        department: department.trim(),
        mobile: mobile.trim(),
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Registration failed.');
      }
    }
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
              onPress={() => {
                setIsLogin(true);
                setErrorMessage(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isLogin && styles.activeTabText]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, !isLogin && styles.activeTab]}
              onPress={() => {
                setIsLogin(false);
                setErrorMessage(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>Register</Text>
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={Colors.danger} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

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
                autoCapitalize="characters"
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
    marginBottom: Spacing.md,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.danger + '44',
  },
  errorBannerText: {
    ...Typography.captionBold,
    color: Colors.danger,
    flex: 1,
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
