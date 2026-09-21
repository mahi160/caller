import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/session';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!username || !pin) {
      setError('Enter your username and PIN.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await login(username.trim(), pin);
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">caller</ThemedText>
        <ThemedText themeColor="textSecondary">Log in with your username and PIN.</ThemedText>

        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholder="Username"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholder="PIN"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
            secureTextEntry
            value={pin}
            onChangeText={setPin}
          />

          {error && <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>}

          <Pressable
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.accentText} />
            ) : (
              <ThemedText style={{ color: theme.accentText, fontWeight: '600' }}>Log in</ThemedText>
            )}
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  button: {
    borderRadius: Radii.pill,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
