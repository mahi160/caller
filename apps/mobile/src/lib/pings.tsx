import { useCallback, useEffect, useState } from 'react';

import { listActivePings, sendPing, type CallerPing } from '@/lib/api';
import { useAuth } from '@/lib/session';

// Pings aren't PocketBase-realtime-subscribable (their collection has no
// ViewRule, since visibility is "Topic Subscribers only" and enforced by our
// own /api/pings/active route instead) — poll instead of SSE. 5-minute
// expiry means a short poll interval is enough to feel live without much cost.
const POLL_INTERVAL_MS = 15_000;

export function usePings() {
  const { token } = useAuth();
  const [pings, setPings] = useState<CallerPing[]>([]);

  const reload = useCallback(async () => {
    if (!token) return;
    setPings(await listActivePings(token));
  }, [token]);

  useEffect(() => {
    reload();
    const interval = setInterval(reload, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [reload]);

  const send = useCallback(
    async (topicId: string) => {
      if (!token) return;
      await sendPing(token, topicId);
      await reload();
    },
    [token, reload],
  );

  return { pings, send };
}
