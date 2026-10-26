import { lazy, type ComponentType } from 'react';
import type { CurrentUserResponseDto } from '@/api/generated/models';
import { hasAnyPermission } from '@/core/permissions/permissions';

const lazyNamed = <P extends object, K extends string>(
  loader: () => Promise<Record<K, ComponentType<P>>>,
  name: K,
) => lazy(async () => ({ default: (await loader())[name] }));

export interface ProtectedRouteDefinition {
  path: string;
  permissions: readonly string[];
  component: ComponentType;
  frame: 'shell' | 'public' | 'experience';
  technicalUser?: boolean;
  allUserTypes?: boolean;
  experienceMode?: 'kiosk' | 'display';
  publicMode?: 'public' | 'device';
}

export const protectedRoutes: readonly ProtectedRouteDefinition[] = [
  {
    path: '/device-mode',
    permissions: [],
    technicalUser: true,
    component: lazyNamed(
      () => import('@/features/public-experiences/DeviceModePage'),
      'DeviceModePage',
    ),
    frame: 'public',
    publicMode: 'device',
  },
  {
    path: '/portfolio',
    permissions: ['site_view'],
    component: lazyNamed(() => import('@/features/portfolio/PortfolioPage'), 'PortfolioPage'),
    frame: 'shell',
  },
  {
    path: '/desk',
    permissions: ['registration_call', 'session_operate'],
    component: lazyNamed(() => import('@/features/cockpit/CockpitPage'), 'CockpitPage'),
    frame: 'shell',
  },
  {
    path: '/my-queues',
    permissions: ['registration_view', 'queue_view'],
    component: lazyNamed(() => import('@/features/queue-operations/MyQueuesPage'), 'MyQueuesPage'),
    frame: 'shell',
  },
  {
    path: '/persons',
    permissions: ['registration_view'],
    component: lazyNamed(() => import('@/features/persons/PersonsPage'), 'PersonsPage'),
    frame: 'shell',
  },
  {
    path: '/appointments',
    permissions: ['appointment_manage', 'appointment_checkin'],
    component: lazyNamed(
      () => import('@/features/appointments/AppointmentsPage'),
      'AppointmentsPage',
    ),
    frame: 'shell',
  },
  {
    path: '/control-room',
    permissions: ['report_view', 'queue_view'],
    component: lazyNamed(() => import('@/features/supervision/ControlRoomPage'), 'ControlRoomPage'),
    frame: 'shell',
  },
  {
    path: '/reports',
    permissions: ['report_view'],
    component: lazyNamed(() => import('@/features/reports/ReportsPage'), 'ReportsPage'),
    frame: 'shell',
  },
  {
    path: '/notifications',
    permissions: ['notification_view'],
    component: lazyNamed(
      () => import('@/features/notifications/NotificationsPage'),
      'NotificationsPage',
    ),
    frame: 'shell',
  },
  {
    path: '/kiosk',
    permissions: [],
    allUserTypes: true,
    component: lazyNamed(() => import('@/features/public-experiences/KioskPage'), 'KioskPage'),
    frame: 'experience',
    experienceMode: 'kiosk',
  },
  {
    path: '/display',
    permissions: [],
    allUserTypes: true,
    component: lazyNamed(() => import('@/features/public-experiences/DisplayPage'), 'DisplayPage'),
    frame: 'experience',
    experienceMode: 'display',
  },
  {
    path: '/onboarding',
    permissions: ['site_create'],
    component: lazyNamed(() => import('@/features/onboarding/OnboardingPage'), 'OnboardingPage'),
    frame: 'shell',
  },
  {
    path: '/settings/*',
    permissions: ['site_edit', 'queue_edit', 'user_manage_admin', 'translation_manage'],
    component: lazyNamed(() => import('@/features/onboarding/SettingsPage'), 'SettingsPage'),
    frame: 'shell',
  },
  {
    path: '/admin/users',
    permissions: ['user_manage_admin'],
    component: lazyNamed(() => import('@/features/users/UsersAdminPage'), 'UsersAdminPage'),
    frame: 'shell',
  },
  {
    path: '/admin/translations',
    permissions: ['translation_manage'],
    component: lazyNamed(
      () => import('@/features/translations/TranslationsAdminPage'),
      'TranslationsAdminPage',
    ),
    frame: 'shell',
  },
  {
    path: '/health',
    permissions: ['system_manage'],
    component: lazyNamed(() => import('@/features/health/HealthPage'), 'HealthPage'),
    frame: 'shell',
  },
  {
    path: '/audit',
    permissions: ['audit_view'],
    component: lazyNamed(() => import('@/features/audit/AuditPage'), 'AuditPage'),
    frame: 'shell',
  },
];

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
