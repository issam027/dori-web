import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '@/core/auth/session-store';
import { hasAnyPermission } from '@/core/permissions/permissions';
import { ChevronLeft, ChevronRight, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import {
  navigationRoutes,
  publicNavigationRoutes,
  type NavigationRouteDefinition,
} from '@/app/protected-routes';

interface NavSection {
  id: string;
  labelKey: string;
  items: readonly NavigationRouteDefinition[];
}

const sectionOrder = ['operations', 'pilotage', 'experiences', 'administration', 'system'] as const;
const sections: readonly NavSection[] = sectionOrder.map((id) => ({
  id,
  labelKey: `nav.${id}`,
  items: [...navigationRoutes, ...publicNavigationRoutes].filter((route) => route.section === id),
}));

export function SidebarAccordion({
  portfolioAvailable = true,
  collapsed = false,
  mobileOpen = false,
  onToggleCollapsed = () => undefined,
  onCloseMobile = () => undefined,
}: {
  portfolioAvailable?: boolean;
  collapsed?: boolean;
  mobileOpen?: boolean;
  onToggleCollapsed?: () => void;
  onCloseMobile?: () => void;
}) {
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
              (item.id !== 'portfolio' || portfolioAvailable),
          ),
        }))
        .filter((section) => section.items.length > 0),
    [portfolioAvailable, user],
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
        <span className="brand-mark">{t('common.d')}</span>
        <strong className="sidebar-label">{t('app.name')}</strong>
        <Button
          variant="unstyled"
          className="sidebar-mobile-close"
          type="button"
          onClick={onCloseMobile}
          aria-label={t('common.fermerLeMenu')}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <nav className="sidebar-nav" aria-label={t('nav.main')}>
        {visibleSections.map((section) => {
          const open = collapsed || openedSection === section.id;
          return (
            <section className="nav-section" key={section.id}>
              <Button
                variant="unstyled"
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
      <Button
        variant="unstyled"
        className="sidebar-collapse"
        type="button"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? t('nav.expandMenu') : t('nav.collapseMenu')}
      >
        {collapsed ? <ChevronRight aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
        <span className="sidebar-label">{t('shell.layouts.sidebarAccordion.reduire')}</span>
      </Button>
    </aside>
  );
}
