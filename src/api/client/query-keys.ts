export const queryKeys = {
  health: {
    all: ['health'] as const,
  },
  sites: {
    all: ['sites'] as const,
    contextSwitcher: ['sites', 'context-switcher'] as const,
    portfolio: ['sites', 'portfolio'] as const,
    detail: (siteId: number | null) => ['sites', 'detail', siteId] as const,
  },
  queues: {
    all: ['queues'] as const,
    bySite: (siteId: number | null, filters?: { isActive?: boolean; usage?: string }) =>
      ['queues', 'site', siteId, filters ?? {}] as const,
    detail: (queueId: number) => ['queues', queueId] as const,
  },
  queueStatus: {
    all: ['queue-status'] as const,
    detail: (queueId: number) => ['queue-status', queueId] as const,
  },
  queuePreview: {
    all: ['queue-preview'] as const,
    bySite: (siteId: number | null) => ['queue-preview', 'site', siteId] as const,
  },
  queueSessions: {
    all: ['queue-sessions'] as const,
    byQueue: (queueId: number) => ['queue-sessions', 'queue', queueId] as const,
  },
  threads: {
    all: ['threads'] as const,
    byQueue: (queueId: number) => ['threads', 'queue', queueId] as const,
  },
  registrations: {
    all: ['registrations'] as const,
    list: (filters: {
      siteId?: number | null;
      queueId?: number;
      personId?: number;
      status?: string;
      businessDate?: string;
      entryType?: string;
      page?: number;
      pageSize?: number;
      sort?: string;
      usage?: string;
    }) => ['registrations', 'list', filters] as const,
    detail: (registrationId: number | null | undefined) =>
      ['registrations', 'detail', registrationId] as const,
  },
  persons: {
    all: ['persons'] as const,
    search: (siteId: number | null, search: string, page: number, pageSize: number, usage?: string) =>
      ['persons', 'search', { siteId, search, page, pageSize, usage }] as const,
    detail: (personId: number | null | undefined) => ['persons', 'detail', personId] as const,
    notes: (personId: number, usage = 'list') => ['persons', 'detail', personId, 'notes', usage] as const,
  },
  tiers: {
    all: ['tiers'] as const,
    catalog: (usage = 'default') => ['tiers', 'catalog', usage] as const,
    byQueue: (queueId: number | undefined) => ['tiers', 'queue', queueId] as const,
    rules: (queueId: number, tierId: number) => ['tiers', 'rules', queueId, tierId] as const,
  },
  availability: (queueId: number, date: string) => ['availability', queueId, date] as const,
  appointments: {
    all: ['appointments'] as const,
    byQueueDate: (queueId: number | undefined, businessDate: string) =>
      ['appointments', 'queue', queueId, 'date', businessDate] as const,
    detail: (registrationId: number | null) => ['appointments', 'detail', registrationId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (filters: { page: number; channel?: string; status?: string; date?: string }) =>
      ['notifications', 'list', filters] as const,
    detail: (notificationId: number | null) => ['notifications', 'detail', notificationId] as const,
    controlRoom: ['notifications', 'control-room'] as const,
  },
  reports: {
    all: ['reports'] as const,
    load: (siteId: number | null) => ['reports', 'load', siteId] as const,
    summary: (siteId: number | null) => ['reports', 'summary', siteId] as const,
    portfolioSummary: (siteId: number) => ['reports', 'portfolio-summary', siteId] as const,
    daily: (siteId: number | null, start: string, end: string, queueIds: readonly number[]) =>
      ['reports', 'daily', { siteId, start, end, queueIds }] as const,
  },
  admin: {
    all: ['admin'] as const,
    sites: ['admin', 'sites'] as const,
    queues: (siteId: number | null) => ['admin', 'queues', siteId] as const,
    users: ['admin', 'users'] as const,
    roles: ['admin', 'roles'] as const,
    tiers: ['admin', 'tiers'] as const,
    translations: (locale: string) => ['admin', 'translations', { locale }] as const,
    assignmentUsers: (search: string, page: number) =>
      ['admin', 'assignment-users', { search, page }] as const,
  },
  publicExperience: {
    kioskQueues: (siteId: number | null) => ['kiosk', 'queues', siteId] as const,
    kioskQueueStatus: (queueId: number) => ['kiosk', 'queue-status', queueId] as const,
    kioskTiers: (queueId: number | undefined) => ['kiosk', 'tiers', queueId] as const,
    kioskTierRules: (queueId: number, tierId: number) =>
      ['kiosk', 'tier-rules', queueId, tierId] as const,
    displayQueues: (siteId: number | null) => ['display', 'queues', siteId] as const,
    displaySnapshot: (queueId: number) => ['display', 'snapshot', queueId] as const,
  },
} as const;
