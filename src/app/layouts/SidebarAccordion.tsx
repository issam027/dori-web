import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '@/core/auth/session-store';
import { hasAnyPermission } from '@/core/permissions/permissions';

interface NavItem {
  path: string;
  labelKey: string;
  permissions: readonly string[];
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
      },
      {
        path: '/my-queues',
        labelKey: 'nav.myQueues',
        permissions: ['registration_view', 'queue_view'],
      },
      {
        path: '/appointments',
        labelKey: 'nav.appointments',
        permissions: ['appointment_manage', 'appointment_checkin'],
      },
      {
        path: '/control-room',
        labelKey: 'nav.controlRoom',
        permissions: ['report_view', 'queue_view'],
      },
      { path: '/portfolio', labelKey: 'nav.portfolio', permissions: ['site_view'] },
      { path: '/reports', labelKey: 'nav.reports', permissions: ['report_view'] },
      { path: '/notifications', labelKey: 'nav.notifications', permissions: ['notification_view'] },
    ],
  },
  {
    id: 'experiences',
    labelKey: 'nav.experiences',
    items: [
      {
        path: '/kiosk',
        labelKey: 'nav.kiosk',
        permissions: ['registration_register', 'appointment_lookup'],
      },
      { path: '/display', labelKey: 'nav.display', permissions: ['queue_view'] },
      { path: '/track', labelKey: 'nav.tracking', permissions: [] },
    ],
  },
  {
    id: 'administration',
    labelKey: 'nav.administration',
    items: [
      { path: '/onboarding', labelKey: 'nav.onboarding', permissions: ['site_create'] },
      {
        path: '/settings',
        labelKey: 'nav.settings',
        permissions: ['site_edit', 'queue_edit', 'user_manage_admin', 'translation_manage'],
      },
      { path: '/health', labelKey: 'nav.health', permissions: ['system_manage'] },
    ],
  },
];

export function SidebarAccordion() {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useSessionStore((state) => state.user);
  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => hasAnyPermission(user, item.permissions)),
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
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">D</span>
        <strong>DORI</strong>
      </div>
      <nav className="sidebar-nav" aria-label={t('nav.main')}>
        {visibleSections.map((section) => {
          const open = openedSection === section.id;
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
                    <NavLink key={item.path} to={item.path}>
                      {t(item.labelKey)}
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </nav>
      <NavLink className="legal-link" to="/legal">
        {t('nav.legal')}
      </NavLink>
    </aside>
  );
}
