import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { loginWithPin, saveLanguage, savePushToken, type CallerUser } from '@/lib/api';
import { registerForPushToken } from '@/lib/push';
import { deleteItem, getItem, setItem } from '@/lib/storage';

const TOKEN_KEY = 'caller_token';
const USER_KEY = 'caller_user';

type AuthState = {
  isLoading: boolean;
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

  useEffect(() => {
    (async () => {
      const [storedToken, storedUser] = await Promise.all([getItem(TOKEN_KEY), getItem(USER_KEY)]);
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

  const login = async (username: string, pin: string) => {
    const result = await loginWithPin(username, pin);
    await Promise.all([setItem(TOKEN_KEY, result.token), setItem(USER_KEY, JSON.stringify(result.record))]);
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
    await Promise.all([deleteItem(TOKEN_KEY), deleteItem(USER_KEY)]);
    setToken(null);
    setUser(null);
  };

  const setLanguage = async (language: 'en' | 'bn') => {
    if (!token || !user) return;
    // update immediately (no restart needed), persist locally, then sync to server
    const updated = { ...user, language };
    setUser(updated);
    await setItem(USER_KEY, JSON.stringify(updated));
    await saveLanguage(token, user.id, language);
  };

  const value = useMemo(
    () => ({ isLoading, token, user, login, logout, setLanguage }),
    [isLoading, token, user],
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
