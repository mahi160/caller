import { useEffect, useState } from 'react';

import { countCompletedToday, countDeclinedToday } from '@/lib/api';
import { useAuth } from '@/lib/session';

function localMidnightIso(): string {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return midnight.toISOString().replace('T', ' ').slice(0, 19);
}

// Runner-facing "today" counters. Recomputed on every call list change so
// they stay live, and reset naturally at the day boundary since the query is
// always relative to "now" rather than a cached start-of-day value.
export function useRunnerDashboardCounts(refreshKey: unknown) {
  const { token, user } = useAuth();
  const [completedToday, setCompletedToday] = useState(0);
  const [declinedToday, setDeclinedToday] = useState(0);

  useEffect(() => {
    if (!token || !user) return;
    const sinceIso = localMidnightIso();
    Promise.all([countCompletedToday(token, user.id, sinceIso), countDeclinedToday(token, sinceIso)]).then(
      ([completed, declined]) => {
        setCompletedToday(completed);
        setDeclinedToday(declined);
      },
    );
  }, [token, user, refreshKey]);

  return { completedToday, declinedToday };
}
