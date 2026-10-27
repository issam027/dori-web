export const queryKeys = {
  health: {
    all: ['health'] as const,
  },
  audit: {
    all: ['audit'] as const,
    list: <T extends object>(filters: T) => ['audit', 'list', filters] as const,
    detail: (eventId: string | undefined) => ['audit', 'detail', eventId] as const,
  },
  sites: {
    all: ['sites'] as const,
    contextSwitcher: ['sites', 'context-switcher'] as const,
    portfolio: ['sites', 'portfolio'] as const,
    detail: (siteId: string | null) => ['sites', 'detail', siteId] as const,
  },
  queues: {
    all: ['queues'] as const,
    bySite: (siteId: string | null, filters?: { isActive?: boolean; usage?: string }) =>
      ['queues', 'site', siteId, filters ?? {}] as const,
    detail: (queueId: string) => ['queues', queueId] as const,
  },
  queueStatus: {
    all: ['queue-status'] as const,
    detail: (queueId: string) => ['queue-status', queueId] as const,
  },
  queuePreview: {
    all: ['queue-preview'] as const,
    bySite: (siteId: string | null) => ['queue-preview', 'site', siteId] as const,
  },
  cockpit: {
    all: ['cockpit'] as const,
    bySite: (siteId: string | null) => ['cockpit', 'site', siteId] as const,
  },
  queueSessions: {
    all: ['queue-sessions'] as const,
    byQueue: (queueId: string) => ['queue-sessions', 'queue', queueId] as const,
  },
  threads: {
    all: ['threads'] as const,
    byQueue: (queueId: string) => ['threads', 'queue', queueId] as const,
  },
  registrations: {
    all: ['registrations'] as const,
    list: (filters: {
      siteId?: string | null;
      queueId?: string;
      personId?: string;
      dateFrom?: string;
      dateTo?: string;
      status?: string;
      search?: string;
      businessDate?: string;
      entryType?: string;
      page?: number;
      pageSize?: number;
      sort?: string;
      usage?: string;
    }) => ['registrations', 'list', filters] as const,
    detail: (registrationId: string | null | undefined) =>
      ['registrations', 'detail', registrationId] as const,
    operator: (
      userId: string | undefined,
      status: string,
      siteId: string | null,
      pageSize: number,
    ) => ['registrations', 'operator', userId, status, siteId, pageSize] as const,
  },
  persons: {
    all: ['persons'] as const,
    search: (
      siteId: string | null,
      search: string,
      page: number,
      pageSize: number,
      usage?: string,
    ) => ['persons', 'search', { siteId, search, page, pageSize, usage }] as const,
    detail: (personId: string | null | undefined) => ['persons', 'detail', personId] as const,
    notes: (personId: string, usage = 'list') =>
      ['persons', 'detail', personId, 'notes', usage] as const,
    adminSearch: <T extends object>(
      siteId: string | null,
      search: string,
      page: number,
      pageSize: number,
      filters: T,
    ) =>
      [...queryKeys.persons.search(siteId, search, page, pageSize, 'admin-page'), filters] as const,
  },
  tiers: {
    all: ['tiers'] as const,
    catalog: (usage = 'default') => ['tiers', 'catalog', usage] as const,
    byQueue: (queueId: string | undefined) => ['tiers', 'queue', queueId] as const,
    rules: (queueId: string, tierId: string) => ['tiers', 'rules', queueId, tierId] as const,
  },
  availability: (queueId: string, date: string) => ['availability', queueId, date] as const,
  availabilityRange: (queueId: string | undefined, dateFrom?: string, dateTo?: string) =>
    ['availability', queueId, dateFrom, dateTo] as const,
  appointments: {
    all: ['appointments'] as const,
    byQueueDate: (queueId: string | undefined, businessDate: string) =>
      ['appointments', 'queue', queueId, 'date', businessDate] as const,
    byQueueRange: (
      queueId: string | undefined,
      dateFrom: string | undefined,
      dateTo: string | undefined,
    ) => ['appointments', 'queue', queueId, 'range', dateFrom, dateTo] as const,
    detail: (registrationId: string | null) => ['appointments', 'detail', registrationId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (filters: { page: number; channel?: string; status?: string; date?: string }) =>
      ['notifications', 'list', filters] as const,
    detail: (notificationId: string | null) => ['notifications', 'detail', notificationId] as const,
    controlRoom: ['notifications', 'control-room'] as const,
  },
  reports: {
    all: ['reports'] as const,
    load: (siteId: string | null) => ['reports', 'load', siteId] as const,
    summary: (siteId: string | null) => ['reports', 'summary', siteId] as const,
    portfolioSummary: (siteId: string) => ['reports', 'portfolio-summary', siteId] as const,
    daily: (siteId: string | null, start: string, end: string, queueIds: readonly string[]) =>
      ['reports', 'daily', { siteId, start, end, queueIds }] as const,
    dailyByGranularity: (
      siteId: string | null,
      start: string,
      end: string,
      queueIds: readonly string[],
      granularity: string,
    ) => [...queryKeys.reports.daily(siteId, start, end, queueIds), granularity] as const,
  },
  monitoring: {
    live: (siteId: string | null) => ['monitoring', 'live', siteId] as const,
    series: <T extends object>(options: T) => ['monitoring', 'series', options] as const,
  },
  admin: {
    all: ['admin'] as const,
    sites: ['admin', 'sites'] as const,
    queues: (siteId: string | null) => ['admin', 'queues', siteId] as const,
    queuesByStatus: (siteId: string | null, status: string) =>
      ['admin', 'queues', siteId, status] as const,
    users: ['admin', 'users'] as const,
    roles: ['admin', 'roles'] as const,
    tiers: ['admin', 'tiers'] as const,
    translations: (locale: string) => ['admin', 'translations', { locale }] as const,
    assignmentUsers: (search: string, page: number) =>
      ['admin', 'assignment-users', { search, page }] as const,
    usersPage: <T extends object>(page: number, filters: T) =>
      ['admin', 'users-page', page, filters] as const,
    usersPages: ['admin', 'users-page'] as const,
    userDetail: (userId: string | undefined) => ['admin', 'user-detail', userId] as const,
    translationsPage: <T extends object>(page: number, filters: T) =>
      ['admin', 'translations-page', page, filters] as const,
    translationPages: ['admin', 'translations-page'] as const,
    siteDirectUsers: (siteId: string | null) => ['admin', 'site-direct-users', siteId] as const,
  },
  queueOperators: {
    byQueue: (queueId: string | undefined) => ['queue-operators', queueId] as const,
    candidates: (
      queueId: string | undefined,
      siteId: string | undefined,
      search: string,
      page: number,
    ) => ['queue-operator-candidates', queueId, siteId, search, page] as const,
  },
  publicExperience: {
    kioskQueues: (siteId: string | null) => ['kiosk', 'queues', siteId] as const,
    kioskQueueStatus: (queueId: string) => ['kiosk', 'queue-status', queueId] as const,
    kioskTiers: (queueId: string | undefined) => ['kiosk', 'tiers', queueId] as const,
    kioskTierRules: (queueId: string, tierId: string) =>
      ['kiosk', 'tier-rules', queueId, tierId] as const,
    displaySnapshot: (queueId: string) => ['display', 'snapshot', queueId] as const,
  },
} as const;
