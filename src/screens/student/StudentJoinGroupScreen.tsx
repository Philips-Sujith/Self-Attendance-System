import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StudentStackParamList } from '../../types/navigation';
import { Ionicons } from '@expo/vector-icons';

type StudentJoinGroupScreenProps = NativeStackScreenProps<
  StudentStackParamList,
  'StudentJoinGroup'
>;

export const StudentJoinGroupScreen: React.FC<StudentJoinGroupScreenProps> = ({
  navigation,
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Join Code Required', 'Please enter the code provided by your instructor.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Successfully Joined!',
        `You have been added to the roster for course with code: ${joinCode.toUpperCase().trim()}`,
        [
          {
            text: 'View Courses',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }, 600);
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

          <Input
            placeholder="e.g. DSD-A24"
            autoCapitalize="characters"
            maxLength={10}
            leftIcon="qr-code-outline"
            value={joinCode}
            onChangeText={(text) => setJoinCode(text.toUpperCase())}
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
    marginBottom: Spacing.lg,
    lineHeight: 18,
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
