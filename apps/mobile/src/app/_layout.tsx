import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { I18nProvider } from '@/lib/i18n';
import { AuthProvider } from '@/lib/session';

function NotificationTapHandler() {
  const router = useRouter();

  useEffect(() => {
    // tapping a push notification (app backgrounded or cold-started from it)
    // brings the user to the call they were notified about
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/');
    });
    return () => sub.remove();
  }, [router]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <I18nProvider>
          <NotificationTapHandler />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="settings" options={{ headerShown: true, title: 'Settings' }} />
          </Stack>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
