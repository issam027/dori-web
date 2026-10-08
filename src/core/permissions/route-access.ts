import type { CurrentUserResponseDto } from '@/api/generated/models';
import { hasAnyPermission } from './permissions';

export interface ProtectedRouteDefinition {
  path: string;
  permissions: readonly string[];
  technicalUser?: boolean;
  allUserTypes?: boolean;
}

export const protectedRoutes: readonly ProtectedRouteDefinition[] = [
  { path: '/portfolio', permissions: ['site_view'] },
  { path: '/desk', permissions: ['registration_call', 'session_operate'] },
  { path: '/my-queues', permissions: ['registration_view', 'queue_view'] },
  { path: '/appointments', permissions: ['appointment_manage', 'appointment_checkin'] },
  { path: '/control-room', permissions: ['report_view', 'queue_view'] },
  { path: '/reports', permissions: ['report_view'] },
  { path: '/notifications', permissions: ['notification_view'] },
  {
    path: '/kiosk',
    permissions: [],
    allUserTypes: true,
  },
  { path: '/display', permissions: [], allUserTypes: true },
  { path: '/onboarding', permissions: ['site_create'] },
  {
    path: '/settings/*',
    permissions: ['site_edit', 'queue_edit', 'user_manage_admin', 'translation_manage'],
  },
  { path: '/health', permissions: ['system_manage'] },
] as const;

export function findFirstAuthorizedPath(user: CurrentUserResponseDto): string {
  const route = protectedRoutes.find((candidate) => {
    if (!candidate.allUserTypes) {
      if (user.userType === 'kiosk' && !candidate.technicalUser) return false;
      if (user.userType !== 'kiosk' && candidate.technicalUser) return false;
    }
    return hasAnyPermission(user, candidate.permissions);
  });
  return route?.path.replace('/*', '') ?? '/profile';
}
