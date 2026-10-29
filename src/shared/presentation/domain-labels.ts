export function registrationStatusKey(status?: string): string {
  const keys: Record<string, string> = {
    waiting: 'common.waiting',
    in_progress: 'common.inProgress',
    served: 'common.servi',
    no_show: 'common.absent',
    cancelled: 'common.cancelled',
    expired: 'common.expired',
  };
  return keys[status ?? ''] ?? 'common.notProvided';
}

export function entryTypeKey(entryType?: string): string {
  return entryType === 'appointment' ? 'appointments.title' : 'reports.analytics.walkins';
}

export function userTypeKey(userType?: string): string {
  return userType === 'kiosk' ? 'audit.userTypes.kiosk' : 'audit.userTypes.human';
}

export function notificationStatusKey(status?: string): string {
  const keys: Record<string, string> = {
    pending: 'notifications.status.pending',
    processing: 'notifications.status.processing',
    delivered: 'notifications.status.delivered',
    failed: 'notifications.status.failed',
  };
  return keys[status ?? ''] ?? 'common.notProvided';
}
