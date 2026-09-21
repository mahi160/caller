import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, changePin } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/lib/session';

export default function SettingsScreen() {
  const { user, token, setLanguage } = useAuth();
  const { t, language } = useT();
  const theme = useTheme();
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!user || !token) return;
    if (newPin.length < 4) {
      setMessage({ text: t('newPin') + ' >= 4', isError: true });
      return;
    }
    setMessage(null);
    setIsSubmitting(true);
    try {
      await changePin(token, user.id, oldPin, newPin);
      setOldPin('');
      setNewPin('');
      setMessage({ text: t('pinChanged'), isError: false });
    } catch (err) {
      setMessage({ text: err instanceof ApiError ? err.message : t('somethingWrong'), isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="title">{t('settingsTitle')}</ThemedText>

          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholder={t('currentPin')}
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
            secureTextEntry
            value={oldPin}
            onChangeText={setOldPin}
          />
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholder={t('newPin')}
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
            secureTextEntry
            value={newPin}
            onChangeText={setNewPin}
          />

          {message && (
            <ThemedText style={{ color: message.isError ? theme.danger : theme.accent }}>{message.text}</ThemedText>
          )}

          <Pressable
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.accentText} />
            ) : (
              <ThemedText style={{ color: theme.accentText, fontWeight: '600' }}>{t('save')}</ThemedText>
            )}
          </Pressable>
        </ThemedView>

        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="smallBold">{t('language')}</ThemedText>
          <ThemedView style={styles.languageRow}>
            <Pressable
              style={[styles.languagePill, { borderColor: theme.border }, language === 'en' && { backgroundColor: theme.accent }]}
              onPress={() => setLanguage('en')}
            >
              <ThemedText style={language === 'en' ? { color: theme.accentText } : undefined}>{t('english')}</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.languagePill, { borderColor: theme.border }, language === 'bn' && { backgroundColor: theme.accent }]}
              onPress={() => setLanguage('bn')}
            >
              <ThemedText style={language === 'bn' ? { color: theme.accentText } : undefined}>{t('bangla')}</ThemedText>
            </Pressable>
          </ThemedView>
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
  languageRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  languagePill: {
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
