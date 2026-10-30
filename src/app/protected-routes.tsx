import { lazy, type ComponentType } from 'react';
import type { CurrentUserResponseDto } from '@/api/generated/models';
import { isCloudDeployment } from '@/core/config/deployment-mode';
import { hasAnyPermission } from '@/core/permissions/permissions';
import {
  Activity,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  FileBarChart,
  HeartPulse,
  Languages,
  LayoutDashboard,
  Monitor,
  ScrollText,
  ServerCog,
  Settings,
  Smartphone,
  Store,
  UserCog,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

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
  cloudOnly?: boolean;
}

export interface NavigationRouteDefinition {
  id: string;
  path: string;
  labelKey: string;
  permissions: readonly string[];
  section: 'operations' | 'pilotage' | 'experiences' | 'administration' | 'system';
  icon: LucideIcon;
  featured?: boolean;
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
    path: '/admin/edge-installations',
    permissions: ['system_manage'],
    cloudOnly: true,
    component: lazyNamed(
      () => import('@/features/edge-installations/EdgeInstallationsPage'),
      'EdgeInstallationsPage',
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

const navigationMetadata: Readonly<
  Record<
    string,
    Omit<NavigationRouteDefinition, 'path' | 'permissions'> & { navigationPath?: string }
  >
> = {
  '/portfolio': {
    id: 'portfolio',
    labelKey: 'nav.portfolio',
    section: 'administration',
    icon: BriefcaseBusiness,
  },
  '/desk': {
    id: 'desk',
    labelKey: 'nav.desk',
    section: 'operations',
    icon: LayoutDashboard,
    featured: true,
  },
  '/my-queues': {
    id: 'queues',
    labelKey: 'nav.myQueues',
    section: 'operations',
    icon: ClipboardList,
    featured: true,
  },
  '/persons': {
    id: 'person',
    labelKey: 'nav.persons',
    section: 'operations',
    icon: UsersRound,
    featured: true,
  },
  '/appointments': {
    id: 'appointment',
    labelKey: 'nav.appointments',
    section: 'operations',
    icon: CalendarDays,
    featured: true,
  },
  '/control-room': {
    id: 'control-room',
    labelKey: 'nav.controlRoom',
    section: 'pilotage',
    icon: Activity,
  },
  '/reports': {
    id: 'reports',
    labelKey: 'nav.reports',
    section: 'pilotage',
    icon: FileBarChart,
  },
  '/notifications': {
    id: 'notifications',
    labelKey: 'nav.notifications',
    section: 'pilotage',
    icon: Bell,
  },
  '/kiosk': { id: 'kiosk', labelKey: 'nav.kiosk', section: 'experiences', icon: Store },
  '/display': {
    id: 'display',
    labelKey: 'nav.display',
    section: 'experiences',
    icon: Monitor,
  },
  '/onboarding': {
    id: 'onboarding',
    labelKey: 'nav.onboarding',
    section: 'administration',
    icon: Store,
  },
  '/settings/*': {
    id: 'settings',
    labelKey: 'nav.settings',
    section: 'administration',
    icon: Settings,
    navigationPath: '/settings',
  },
  '/admin/users': {
    id: 'users',
    labelKey: 'nav.usersAdmin',
    section: 'administration',
    icon: UserCog,
  },
  '/admin/translations': {
    id: 'translations',
    labelKey: 'nav.translations',
    section: 'system',
    icon: Languages,
  },
  '/health': {
    id: 'health',
    labelKey: 'nav.health',
    section: 'system',
    icon: HeartPulse,
  },
  '/admin/edge-installations': {
    id: 'edge-installations',
    labelKey: 'nav.edgeInstallations',
    section: 'system',
    icon: ServerCog,
  },
  '/audit': { id: 'audit', labelKey: 'nav.audit', section: 'system', icon: ScrollText },
};

export const navigationRoutes: readonly NavigationRouteDefinition[] = protectedRoutes.flatMap(
  (route) => {
    if (route.cloudOnly && !isCloudDeployment) return [];
    const metadata = navigationMetadata[route.path];
    if (!metadata) return [];
    return [
      {
        id: metadata.id,
        path: metadata.navigationPath ?? route.path,
        labelKey: metadata.labelKey,
        permissions: route.permissions,
        section: metadata.section,
        icon: metadata.icon,
        featured: metadata.featured,
      },
    ];
  },
);

export const publicNavigationRoutes: readonly NavigationRouteDefinition[] = [
  {
    id: 'tracking',
    path: '/track',
    labelKey: 'nav.tracking',
    permissions: [],
    section: 'experiences',
    icon: Smartphone,
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
