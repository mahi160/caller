import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  loadStoredServerUrl,
  loginWithPin,
  saveLanguage,
  savePushToken,
  setServerUrl,
  type CallerUser,
} from '@/lib/api';
import { discoverServer } from '@/lib/discovery';
import { registerForPushToken } from '@/lib/push';

const TOKEN_KEY = 'caller_token';
const USER_KEY = 'caller_user';

type AuthState = {
  isLoading: boolean;
  serverUrl: string | null;
  isDiscoveringServer: boolean;
  connectToServer: (url: string) => Promise<void>;
  retryDiscovery: () => Promise<void>;
  token: string | null;
  user: CallerUser | null;
  login: (username: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  setLanguage: (language: 'en' | 'bn') => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CallerUser | null>(null);
  const [serverUrl, setServerUrlState] = useState<string | null>(null);
  const [isDiscoveringServer, setIsDiscoveringServer] = useState(false);

  const runDiscovery = async () => {
    setIsDiscoveringServer(true);
    try {
      const found = await discoverServer();
      if (found) {
        await setServerUrl(found);
        setServerUrlState(found);
      }
    } finally {
      setIsDiscoveringServer(false);
    }
  };

  useEffect(() => {
    (async () => {
      const stored = await loadStoredServerUrl();
      if (stored) {
        setServerUrlState(stored);
      } else {
        await runDiscovery();
      }

      const [storedToken, storedUser] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);
      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } catch {
          // corrupted local session; fall through to logged-out state
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const connectToServer = async (url: string) => {
    await setServerUrl(url);
    setServerUrlState(url);
  };

  const login = async (username: string, pin: string) => {
    const result = await loginWithPin(username, pin);
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, result.token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(result.record)),
    ]);
    setToken(result.token);
    setUser(result.record);

    registerForPushToken()
      .then((expoPushToken) => {
        if (expoPushToken) {
          return savePushToken(result.token, result.record.id, expoPushToken);
        }
      })
      .catch(() => {
        // push registration is best-effort; app still works via the in-app realtime feed
      });
  };

  const logout = async () => {
    await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY)]);
    setToken(null);
    setUser(null);
  };

  const setLanguage = async (language: 'en' | 'bn') => {
    if (!token || !user) return;
    // update immediately (no restart needed), persist locally, then sync to server
    const updated = { ...user, language };
    setUser(updated);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updated));
    await saveLanguage(token, user.id, language);
  };

  const value = useMemo(
    () => ({
      isLoading,
      serverUrl,
      isDiscoveringServer,
      connectToServer,
      retryDiscovery: runDiscovery,
      token,
      user,
      login,
      logout,
      setLanguage,
    }),
    [isLoading, serverUrl, isDiscoveringServer, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
