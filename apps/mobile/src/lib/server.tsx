import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { discoverServer } from '@/lib/discovery';
import { getItem, setItem } from '@/lib/storage';

const SERVER_URL_KEY = 'caller_server_url';

// Single source of truth for the API base URL: lib/api.ts reads
// `apiUrl.current` directly (no React needed at fetch call sites);
// ServerProvider below just mirrors it into state so UI can react to it.
// Object-with-a-field instead of an exported `let` so mutation is an
// explicit, visible assignment rather than relying on ESM live-binding
// semantics.
export const apiUrl = { current: process.env.EXPO_PUBLIC_API_URL ?? '' };

type ServerState = {
  url: string | null; // null = not yet resolved
  isDiscovering: boolean;
  connect: (url: string) => Promise<void>;
  retryDiscovery: () => Promise<void>;
};

const ServerContext = createContext<ServerState | null>(null);

export function ServerProvider({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const connect = async (value: string) => {
    apiUrl.current = value;
    await setItem(SERVER_URL_KEY, value);
    setUrl(value);
  };

  const retryDiscovery = async () => {
    setIsDiscovering(true);
    try {
      const found = await discoverServer();
      if (found) await connect(found);
    } finally {
      setIsDiscovering(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') {
        // the PWA is served by the same server it talks to; no discovery needed
        apiUrl.current = '';
        setUrl('');
        return;
      }
      const stored = await getItem(SERVER_URL_KEY);
      if (stored) {
        apiUrl.current = stored;
        setUrl(stored);
      } else {
        await retryDiscovery();
      }
    })();
  }, []);

  const value = useMemo(() => ({ url, isDiscovering, connect, retryDiscovery }), [url, isDiscovering]);

  return <ServerContext.Provider value={value}>{children}</ServerContext.Provider>;
}

export function useServer(): ServerState {
  const ctx = useContext(ServerContext);
  if (!ctx) {
    throw new Error('useServer must be used within a ServerProvider');
  }
  return ctx;
}
