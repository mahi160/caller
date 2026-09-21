import { useCallback, useEffect, useState } from 'react';

import { listItems, listPins, pinItem, unpinItem, type CallerItem, type CallerPin } from '@/lib/api';
import { useAuth } from '@/lib/session';

export function useItemsAndPins() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<CallerItem[]>([]);
  const [pins, setPins] = useState<CallerPin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [loadedItems, loadedPins] = await Promise.all([listItems(token), listPins(token)]);
      setItems(loadedItems);
      setPins(loadedPins);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  const pinnedItemIds = new Set(pins.map((p) => p.item));
  const pinned = items.filter((i) => pinnedItemIds.has(i.id));
  const unpinned = items.filter((i) => !pinnedItemIds.has(i.id));

  const togglePin = async (itemId: string) => {
    if (!token || !user) return;
    const existing = pins.find((p) => p.item === itemId);
    if (existing) {
      await unpinItem(token, existing.id);
    } else {
      await pinItem(token, user.id, itemId);
    }
    await reload();
  };

  return { isLoading, items, pinned, unpinned, togglePin };
}
