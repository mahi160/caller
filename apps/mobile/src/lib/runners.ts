import { useEffect, useState } from 'react';

import { listRunners, type CallerRunner } from '@/lib/api';
import { useAuth } from '@/lib/session';

export function useRunners() {
  const { token } = useAuth();
  const [runners, setRunners] = useState<CallerRunner[]>([]);

  useEffect(() => {
    if (!token) return;
    listRunners(token).then(setRunners);
  }, [token]);

  return runners;
}
