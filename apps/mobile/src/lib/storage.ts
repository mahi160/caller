import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// expo-secure-store has no web implementation at all (its web shim is a bare
// `export default {}`), so every call throws there. Fall back to
// localStorage on web — not secure storage, but the standard/only option for
// a PWA, and app tokens there are the norm (e.g. most web apps do this).
export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
