import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '@/core/auth/session-store';
import { hasAnyPermission } from '@/core/permissions/permissions';
import {
  Activity,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  HeartPulse,
  LayoutDashboard,
  Monitor,
  Settings,
  ShieldCheck,
  Smartphone,
  Store,
  X,
  type LucideIcon,
} from 'lucide-react';

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
    ],
  },
  {
    id: 'experiences',
    labelKey: 'nav.experiences',
    items: [
      {
        path: '/kiosk',
        labelKey: 'nav.kiosk',
        permissions: [],
        icon: Store,
      },
      { path: '/display', labelKey: 'nav.display', permissions: [], icon: Monitor },
      { path: '/track', labelKey: 'nav.tracking', permissions: [], icon: Smartphone },
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
        path: '/reports',
        labelKey: 'nav.reports',
        permissions: ['report_view'],
        icon: FileBarChart,
      },
      {
        path: '/notifications',
        labelKey: 'nav.notifications',
        permissions: ['notification_view'],
        icon: Bell,
      },
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
        path: '/onboarding',
        labelKey: 'nav.onboarding',
        permissions: ['site_create'],
        icon: Store,
      },
      {
        path: '/settings',
        labelKey: 'nav.settings',
        permissions: ['site_edit', 'queue_edit', 'user_manage_admin', 'translation_manage'],
        icon: Settings,
      },
      { path: '/health', labelKey: 'nav.health', permissions: ['system_manage'], icon: HeartPulse },
    ],
  },
];

export function SidebarAccordion({
  siteCount,
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
              hasAnyPermission(user, item.permissions) &&
              !(item.path === '/portfolio' && siteCount !== undefined && siteCount <= 1),
          ),
        }))
        .filter((section) => section.items.length > 0),
    [siteCount, user],
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
        <span className="brand-mark">{__t('ui.shell.layouts.sidebar_accordion.d_1hkaexf')}</span>
        <strong className="sidebar-label">
          {__t('ui.shell.layouts.sidebar_accordion.dori_9y7skh')}
        </strong>
        <button
          className="sidebar-mobile-close"
          type="button"
          onClick={onCloseMobile}
          aria-label={__t('ui.shell.layouts.sidebar_accordion.fermer_le_menu_1fo6hqo')}
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <nav className="sidebar-nav" aria-label={t('nav.main')}>
        {visibleSections.map((section) => {
          const open = collapsed || openedSection === section.id;
          return (
            <section className="nav-section" key={section.id}>
              <button
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
              </button>
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
      <button
        className="sidebar-collapse"
        type="button"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Agrandir le menu' : 'Réduire le menu'}
      >
        {collapsed ? <ChevronRight aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
        <span className="sidebar-label">
          {__t('ui.shell.layouts.sidebar_accordion.reduire_zrtdhr')}
        </span>
      </button>
    </aside>
  );
}
