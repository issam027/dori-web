export const queryKeys = {
  sites: {
    all: ['sites'] as const,
    detail: (siteId: number) => ['sites', siteId] as const,
  },
  queues: {
    all: ['queues'] as const,
    bySite: (siteId: number) => ['queues', 'site', siteId] as const,
    detail: (queueId: number) => ['queues', queueId] as const,
  },
  queueStatus: (queueId: number) => ['queueStatus', queueId] as const,
  registrations: {
    all: ['registrations'] as const,
    detail: (registrationId: number) => ['registrations', registrationId] as const,
  },
  persons: {
    all: ['persons'] as const,
    detail: (personId: number) => ['persons', personId] as const,
  },
  notes: (personId: number) => ['notes', personId] as const,
  tiers: (queueId?: number) => ['tiers', queueId ?? 'catalog'] as const,
  notifications: ['notifications'] as const,
  reports: ['reports'] as const,
  users: ['users'] as const,
  translations: ['translations'] as const,
} as const;
