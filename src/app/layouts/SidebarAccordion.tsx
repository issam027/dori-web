import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '@/core/auth/session-store';
import { hasAnyPermission } from '@/core/permissions/permissions';
import {
  Activity,
  ScrollText,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  HeartPulse,
  LayoutDashboard,
  Languages,
  Monitor,
  Settings,
  ShieldCheck,
  Smartphone,
  Store,
  UserCog,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/design-system/components/Button';

interface NavItem {
  path: string;
  labelKey: string;
  permissions: readonly string[];
  icon: LucideIcon;
}
interface NavSection {
  id: string;
  labelKey: string;
  items: readonly NavItem[];
}

const sections: readonly NavSection[] = [
  {
    id: 'operations',
    labelKey: 'nav.operations',
    items: [
      {
        path: '/desk',
        labelKey: 'nav.desk',
        permissions: ['registration_call', 'session_operate'],
        icon: LayoutDashboard,
      },
      {
        path: '/my-queues',
        labelKey: 'nav.myQueues',
        permissions: ['registration_view', 'queue_view'],
        icon: ClipboardList,
      },
      {
        path: '/appointments',
        labelKey: 'nav.appointments',
        permissions: ['appointment_manage', 'appointment_checkin'],
        icon: CalendarDays,
      },
      {
        path: '/persons',
        labelKey: 'nav.persons',
        permissions: ['registration_view'],
        icon: UsersRound,
      },
    ],
  },
  {
    id: 'pilotage',
    labelKey: 'nav.pilotage',
    items: [
      {
        path: '/control-room',
        labelKey: 'nav.controlRoom',
        permissions: ['report_view', 'queue_view'],
        icon: Activity,
      },
      {
        path: '/notifications',
        labelKey: 'nav.notifications',
        permissions: ['notification_view'],
        icon: Bell,
      },
      {
        path: '/reports',
        labelKey: 'nav.reports',
        permissions: ['report_view'],
        icon: FileBarChart,
      },
    ],
  },
  {
    id: 'experiences',
    labelKey: 'nav.experiences',
    items: [
      { path: '/kiosk', labelKey: 'nav.kiosk', permissions: [], icon: Store },
      { path: '/display', labelKey: 'nav.display', permissions: [], icon: Monitor },
      { path: '/track', labelKey: 'nav.tracking', permissions: [], icon: Smartphone },
    ],
  },
  {
    id: 'administration',
    labelKey: 'nav.administration',
    items: [
      {
        path: '/portfolio',
        labelKey: 'nav.portfolio',
        permissions: ['site_view'],
        icon: BriefcaseBusiness,
      },
      {
        path: '/settings',
        labelKey: 'nav.settings',
        permissions: ['site_edit', 'queue_edit', 'user_manage_admin', 'translation_manage'],
        icon: Settings,
      },
      {
        path: '/admin/users',
        labelKey: 'nav.usersAdmin',
        permissions: ['user_manage_admin'],
        icon: UserCog,
      },
      {
        path: '/onboarding',
        labelKey: 'nav.onboarding',
        permissions: ['site_create'],
        icon: Store,
      },
    ],
  },
  {
    id: 'system',
    labelKey: 'nav.system',
    items: [
      {
        path: '/admin/translations',
        labelKey: 'nav.translations',
        permissions: ['translation_manage'],
        icon: Languages,
      },
      { path: '/health', labelKey: 'nav.health', permissions: ['system_manage'], icon: HeartPulse },
      { path: '/audit', labelKey: 'nav.audit', permissions: ['audit_view'], icon: ScrollText },
    ],
  },
];

export function SidebarAccordion({
  collapsed = false,
  mobileOpen = false,
  onToggleCollapsed = () => undefined,
  onCloseMobile = () => undefined,
}: {
  siteCount?: number;
  collapsed?: boolean;
  mobileOpen?: boolean;
  onToggleCollapsed?: () => void;
  onCloseMobile?: () => void;
}) {
  const { t: __t } = useTranslation();
  const { t } = useTranslation();
  const location = useLocation();
  const user = useSessionStore((state) => state.user);
  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) =>
              hasAnyPermission(user, item.permissions),
          ),
        }))
        .filter((section) => section.items.length > 0),
    [user],
  );
  const activeSection = visibleSections.find((section) =>
    section.items.some((item) => location.pathname.startsWith(item.path)),
  )?.id;
  const [accordionState, setAccordionState] = useState({
    pathname: location.pathname,
    openedSection: activeSection ?? null,
  });
  const openedSection =
    accordionState.pathname === location.pathname
      ? accordionState.openedSection
      : (activeSection ?? null);

  return (
    <aside
      className={`sidebar${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-mobile-open' : ''}`}
    >
      <div className="sidebar-brand">
        <span className="brand-mark">{__t('common.d')}</span>
        <strong className="sidebar-label">{__t('app.name')}</strong>
        <Button variant="unstyled"
          className="sidebar-mobile-close"
          type="button"
          onClick={onCloseMobile}
          aria-label={__t('common.fermerLeMenu')}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <nav className="sidebar-nav" aria-label={t('nav.main')}>
        {visibleSections.map((section) => {
          const open = collapsed || openedSection === section.id;
          return (
            <section className="nav-section" key={section.id}>
              <Button variant="unstyled"
                type="button"
                className="nav-section-toggle"
                aria-expanded={open}
                onClick={() => {
                  setAccordionState({
                    pathname: location.pathname,
                    openedSection: open ? null : section.id,
                  });
                }}
              >
                {t(section.labelKey)}
                <span aria-hidden="true">⌄</span>
              </Button>
              {open ? (
                <div className="nav-links">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      title={t(item.labelKey)}
                      onClick={onCloseMobile}
                    >
                      <item.icon aria-hidden="true" />
                      <span className="sidebar-label">{t(item.labelKey)}</span>
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </nav>
      <NavLink
        className="legal-link"
        to="/legal"
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
        title={t('nav.legal')}
        onClick={onCloseMobile}
      >
        <ShieldCheck aria-hidden="true" />
        <span className="sidebar-label">{t('nav.legal')}</span>
      </NavLink>
      <Button variant="unstyled"
        className="sidebar-collapse"
        type="button"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? t('nav.expandMenu') : t('nav.collapseMenu')}
      >
        {collapsed ? <ChevronRight aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
        <span className="sidebar-label">{__t('shell.layouts.sidebarAccordion.reduire')}</span>
      </Button>
    </aside>
  );
}
