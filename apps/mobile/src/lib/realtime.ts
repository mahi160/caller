import EventSource from 'react-native-sse';

import { apiUrl } from '@/lib/server';

type RealtimeEvent<T> = {
  action: 'create' | 'update' | 'delete';
  record: T;
};

// Subscribes to a PocketBase realtime collection feed. PocketBase's protocol:
// 1. open an SSE connection to /api/realtime, wait for the "PB_CONNECT" event
//    (carries the clientId)
// 2. POST {clientId, subscriptions} back to /api/realtime to register interest
// 3. subsequent named events (one per subscribed collection) carry {action, record}
export function subscribeToCollection<T>(
  token: string,
  collection: string,
  onEvent: (event: RealtimeEvent<T>) => void,
): () => void {
  const es = new EventSource<string>(`${apiUrl.current}/api/realtime`, {
    headers: { Authorization: token },
  });

  let clientId: string | null = null;

  es.addEventListener('PB_CONNECT', (event: any) => {
    try {
      const data = JSON.parse(event.data);
      clientId = data.clientId;
      fetch(`${apiUrl.current}/api/realtime`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ clientId, subscriptions: [collection] }),
      }).catch(() => {
        // subscription registration failed; the caller will simply not receive
        // live updates until reconnect, initial list load already covers state
      });
    } catch {
      // malformed PB_CONNECT payload; ignore and let the connection retry
    }
  });

  es.addEventListener(collection, (event: any) => {
    try {
      onEvent(JSON.parse(event.data));
    } catch {
      // malformed event payload; skip it
    }
  });

  return () => {
    es.close();
  };
}
