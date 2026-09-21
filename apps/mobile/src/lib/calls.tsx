import { useCallback, useEffect, useRef, useState } from 'react';

import {
  acceptCall,
  cancelCall,
  completeCall,
  createCall,
  declineCall,
  listCalls,
  refireCall,
  retargetCall,
  type CallerCall,
} from '@/lib/api';
import { subscribeToCollection } from '@/lib/realtime';
import { useAuth } from '@/lib/session';

export function useCalls() {
  const { token } = useAuth();
  const [calls, setCalls] = useState<CallerCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const callsRef = useRef(calls);
  callsRef.current = calls;

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    listCalls(token).then((loaded) => {
      if (!cancelled) {
        setCalls(loaded);
        setIsLoading(false);
      }
    });

    const unsubscribe = subscribeToCollection<CallerCall>(token, 'calls', ({ action, record }) => {
      setCalls((prev) => {
        if (action === 'delete') {
          return prev.filter((c) => c.id !== record.id);
        }
        const exists = prev.some((c) => c.id === record.id);
        if (exists) {
          return prev.map((c) => (c.id === record.id ? record : c));
        }
        return [record, ...prev];
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [token]);

  const requestItem = useCallback(
    async (requesterId: string, itemId: string, targetRunnerId?: string, buyNote?: string) => {
      if (!token) return;
      await createCall(token, requesterId, itemId, targetRunnerId, buyNote);
    },
    [token],
  );

  const accept = useCallback(
    async (callId: string) => {
      if (!token) return;
      await acceptCall(token, callId);
    },
    [token],
  );

  const decline = useCallback(
    async (callId: string) => {
      if (!token) return;
      await declineCall(token, callId);
    },
    [token],
  );

  const retarget = useCallback(
    async (callId: string, targetRunnerId: string) => {
      if (!token) return;
      await retargetCall(token, callId, targetRunnerId);
    },
    [token],
  );

  const refire = useCallback(
    async (callId: string) => {
      if (!token) return;
      await refireCall(token, callId);
    },
    [token],
  );

  const cancel = useCallback(
    async (callId: string) => {
      if (!token) return;
      await cancelCall(token, callId);
    },
    [token],
  );

  const complete = useCallback(
    async (callId: string) => {
      if (!token) return;
      await completeCall(token, callId);
    },
    [token],
  );

  return { calls, isLoading, requestItem, accept, decline, retarget, refire, cancel, complete };
}
