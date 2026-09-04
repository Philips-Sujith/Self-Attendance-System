import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StudentStackParamList } from '../../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { groupService } from '../../services/groupService';

type StudentJoinGroupScreenProps = NativeStackScreenProps<
  StudentStackParamList,
  'StudentJoinGroup'
>;

export const StudentJoinGroupScreen: React.FC<StudentJoinGroupScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleJoin = async () => {
    setErrorMessage(null);
    const cleanedCode = joinCode.trim().toUpperCase();

    if (!cleanedCode) {
      setErrorMessage('Please enter the course join code.');
      return;
    }

    if (!user) {
      setErrorMessage('You must be logged in to join a course.');
      return;
    }

    setIsSubmitting(true);
    const result = await groupService.joinCourseGroupByCode(user.id, cleanedCode, user);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Could not join course group.');
      return;
    }

    Alert.alert(
      '🎉 Enrolled Successfully!',
      `You have joined ${result.group?.name} (${result.group?.code} - ${result.group?.section}). You will now receive attendance alerts for this class.`,
      [
        {
          text: 'Go to My Courses',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Join Course Group"
        subtitle="One-time enrollment per semester"
        showBack
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Card variant="elevated" style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="key-outline" size={32} color={Colors.secondary} />
          </View>

          <Text style={styles.title}>Enter Course Join Code</Text>
          <Text style={styles.subtitle}>
            Enter the 6-character code shared by your professor in class or via group chat.
          </Text>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={Colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <Input
            placeholder="e.g. DSD-A24"
            autoCapitalize="characters"
            maxLength={10}
            leftIcon="qr-code-outline"
            value={joinCode}
            onChangeText={(text) => {
              setJoinCode(text.toUpperCase());
              setErrorMessage(null);
            }}
            containerStyle={styles.inputContainer}
          />

          <Button
            title="Join Course Group"
            variant="secondary"
            size="lg"
            loading={isSubmitting}
            onPress={handleJoin}
          />
        </Card>



        {/* Info card */}
        <Card style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.info} />
          <Text style={styles.infoText}>
            You only need to join a course once. After joining, you will automatically receive
            push notifications whenever an attendance session opens for that subject.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.secondary + '44',
  },
  title: {
    ...Typography.h2,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    lineHeight: 18,
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
    width: '100%',
  },
  errorText: {
    ...Typography.captionBold,
    color: Colors.danger,
    flex: 1,
  },
  inputContainer: {
    width: '100%',
    marginBottom: Spacing.lg,
  },

  infoCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  infoText: {
    ...Typography.caption,
    flex: 1,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
});
