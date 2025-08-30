import { useMemo } from 'react';
import type { Conversation, ContactFlag } from '../types';

export function useFlagsFilters(conversations: Conversation[]) {
  return useMemo(() => {
    const map = new Map<string, ContactFlag>();
    conversations.forEach(conv => {
      conv.contactFlags.forEach(flag => {
        if (!map.has(flag.labelId)) {
          map.set(flag.labelId, flag);
        }
      });
    });
    return Array.from(map.values());
  }, [conversations]);
}
