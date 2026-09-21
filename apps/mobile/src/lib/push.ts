import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Web push needs a service worker + VAPID keys, not set up yet; the PWA
// falls back to the in-app realtime feed for now (see lib/calls.ts).
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Registers this device for push and returns an Expo push token, or null if
// permission was denied / running somewhere push isn't supported (e.g. web,
// or a simulator without push capability, or no EAS project configured yet).
export async function registerForPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }
  if (!Device.isDevice) {
    return null; // push notifications don't work on simulators/emulators
  }

  // Expo Go (SDK 53+) no longer supports remote push at all — calling any of
  // the APIs below throws instead of just failing quietly. A real device
  // build (dev client / standalone / EAS build) is required for push.
  if (Constants.appOwnership === 'expo') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  try {
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return token.data;
  } catch {
    // no EAS project linked yet, or push service unavailable; degrade gracefully
    return null;
  }
}
