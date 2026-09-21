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
  const { login, serverUrl, isDiscoveringServer, connectToServer, retryDiscovery } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualHost, setManualHost] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

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

  const onConnectManually = async () => {
    const host = manualHost.trim();
    if (!host) return;
    setIsConnecting(true);
    setError(null);
    try {
      const url = host.startsWith('http') ? host : `http://${host}`;
      const res = await fetch(`${url}/healthz`);
      if (!res.ok) throw new Error();
      await connectToServer(url);
    } catch {
      setError("Couldn't reach a caller server at that address.");
    } finally {
      setIsConnecting(false);
    }
  };

  if (serverUrl === null) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="title">caller</ThemedText>
          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
            {isDiscoveringServer ? (
              <>
                <ActivityIndicator color={theme.accent} />
                <ThemedText themeColor="textSecondary">
                  Looking for your caller server on this network
                </ThemedText>
              </>
            ) : (
              <>
                <ThemedText themeColor="textSecondary">
                  Couldn't find a caller server automatically. Enter its address, or make sure
                  you're on the same Wi-Fi as the server.
                </ThemedText>
                <TextInput
                  style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                  placeholder="192.168.1.50:8090"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={manualHost}
                  onChangeText={setManualHost}
                />
                {error && <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>}
                <Pressable
                  style={[styles.button, { backgroundColor: theme.accent }]}
                  onPress={onConnectManually}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <ActivityIndicator color={theme.accentText} />
                  ) : (
                    <ThemedText style={{ color: theme.accentText, fontWeight: '600' }}>Connect</ThemedText>
                  )}
                </Pressable>
                <Pressable onPress={retryDiscovery}>
                  <ThemedText themeColor="textSecondary">Search again</ThemedText>
                </Pressable>
              </>
            )}
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

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
