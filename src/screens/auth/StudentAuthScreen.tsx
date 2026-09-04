import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
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

type StudentAuthScreenProps = NativeStackScreenProps<AuthStackParamList, 'StudentAuth'>;

export const StudentAuthScreen: React.FC<StudentAuthScreenProps> = ({ route, navigation }) => {
  const initialMode = route.params?.mode || 'login';
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const { signIn, signUpStudent, isSubmitting } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [classSection, setClassSection] = useState('CSE - Section B');
  const [mobile, setMobile] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setInfoMessage(null);

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
      if (!rollNo.trim()) {
        setErrorMessage('Please enter your Roll Number.');
        return;
      }

      const result = await signUpStudent({
        email: email.trim(),
        password,
        name: name.trim(),
        rollNo: rollNo.trim(),
        department: department.trim(),
        classSection: classSection.trim(),
        mobile: mobile.trim(),
      });

      if (result.requiresEmailConfirmation) {
        setInfoMessage(
          'Account registered! If email confirmation is enabled on your Supabase project, please check your inbox (or verify the user in the Supabase Auth dashboard), then sign in.'
        );
        setIsLogin(true);
      } else if (!result.success) {
        setErrorMessage(result.error || 'Registration failed.');
      }
    }
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
              onPress={() => {
                setIsLogin(true);
                setErrorMessage(null);
                setInfoMessage(null);
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
                setInfoMessage(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>Register</Text>
            </TouchableOpacity>
          </View>

          {/* Info Banner (e.g. Email Confirmation) */}
          {infoMessage && (
            <View style={styles.infoBanner}>
              <Ionicons name="mail-outline" size={18} color={Colors.secondary} />
              <Text style={styles.infoBannerText}>{infoMessage}</Text>
            </View>
          )}

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
            loading={isSubmitting}
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
    backgroundColor: Colors.secondary,
  },
  tabText: {
    ...Typography.bodyBold,
    color: Colors.textMuted,
  },
  activeTabText: {
    color: Colors.textInverse,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
  },
  infoBannerText: {
    ...Typography.captionBold,
    color: Colors.secondary,
    flex: 1,
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
    color: Colors.primaryLight,
  },
});
