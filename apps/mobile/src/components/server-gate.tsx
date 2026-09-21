import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useServer } from '@/lib/server';

// Blocks rendering of children until a server URL is resolved (LAN discovery
// on native, same-origin on web — see lib/server.tsx). Owns the "couldn't
// find a server" manual-entry fallback so downstream screens (login, etc.)
// never need to think about server connectivity.
export function ServerGate({ children }: { children: ReactNode }) {
  const { url, isDiscovering, connect, retryDiscovery } = useServer();
  const theme = useTheme();
  const [manualHost, setManualHost] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (url !== null) {
    return <>{children}</>;
  }

  const onConnectManually = async () => {
    const host = manualHost.trim();
    if (!host) return;
    setIsConnecting(true);
    setError(null);
    try {
      const target = host.startsWith('http') ? host : `http://${host}`;
      const res = await fetch(`${target}/healthz`);
      if (!res.ok) throw new Error();
      await connect(target);
    } catch {
      setError("Couldn't reach a caller server at that address.");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">caller</ThemedText>
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          {isDiscovering ? (
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
