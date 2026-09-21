import { useCallback, useEffect, useState } from 'react';

import {
  listSubscriptions,
  listTopics,
  subscribeToTopic,
  unsubscribeFromTopic,
  type CallerSubscription,
  type CallerTopic,
} from '@/lib/api';
import { useAuth } from '@/lib/session';

export function useTopicsAndSubscriptions() {
  const { token, user } = useAuth();
  const [topics, setTopics] = useState<CallerTopic[]>([]);
  const [subscriptions, setSubscriptions] = useState<CallerSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [loadedTopics, loadedSubs] = await Promise.all([listTopics(token), listSubscriptions(token)]);
      setTopics(loadedTopics);
      setSubscriptions(loadedSubs);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  const subscribedTopicIds = new Set(subscriptions.map((s) => s.topic));
  const isSubscribed = (topicId: string) => subscribedTopicIds.has(topicId);

  const toggleSubscription = async (topicId: string) => {
    if (!token || !user) return;
    const existing = subscriptions.find((s) => s.topic === topicId);
    if (existing) {
      await unsubscribeFromTopic(token, existing.id);
    } else {
      await subscribeToTopic(token, user.id, topicId);
    }
    await reload();
  };

  return { isLoading, topics, isSubscribed, toggleSubscription };
}
