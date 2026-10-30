import { useState } from 'react';

export type CockpitSort = 'operational' | 'waiting' | 'name';
export type CockpitDensity = 'comfortable' | 'compact';

interface CockpitPreferences {
  sort: CockpitSort;
  density: CockpitDensity;
  favoriteQueueIds: string[];
  collapsedQueueIds: string[];
  soundsEnabled: boolean;
}

const defaults: CockpitPreferences = {
  sort: 'operational',
  density: 'comfortable',
  favoriteQueueIds: [],
  collapsedQueueIds: [],
  soundsEnabled: false,
};

export function useCockpitPreferences(siteId: string | null, userId?: string) {
  const key = `dori:cockpit:${siteId ?? 'none'}${userId ? `:user:${userId}` : ''}:preferences`;
  const [, setRevision] = useState(0);
  const preferences = (() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? ({ ...defaults, ...JSON.parse(stored) } as CockpitPreferences) : defaults;
    } catch {
      return defaults;
    }
  })();
  const save = (partial: Partial<CockpitPreferences>) => {
    let next = { ...preferences, ...partial };
    try {
      const stored = localStorage.getItem(key);
      if (stored) next = { ...defaults, ...JSON.parse(stored), ...partial } as CockpitPreferences;
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Preferences are optional when browser storage is unavailable.
    }
    setRevision((current) => current + 1);
  };

  return {
    ...preferences,
    setSort: (sort: CockpitSort) => {
      save({ sort });
    },
    setDensity: (density: CockpitDensity) => {
      save({ density });
    },
    toggleFavorite: (queueId: string) => {
      save({
        favoriteQueueIds: preferences.favoriteQueueIds.includes(queueId)
          ? preferences.favoriteQueueIds.filter((id) => id !== queueId)
          : [...preferences.favoriteQueueIds, queueId],
      });
    },
    toggleCollapsed: (queueId: string) => {
      save({
        collapsedQueueIds: preferences.collapsedQueueIds.includes(queueId)
          ? preferences.collapsedQueueIds.filter((id) => id !== queueId)
          : [...preferences.collapsedQueueIds, queueId],
      });
    },
    setSoundsEnabled: (soundsEnabled: boolean) => {
      save({ soundsEnabled });
    },
  };
}
