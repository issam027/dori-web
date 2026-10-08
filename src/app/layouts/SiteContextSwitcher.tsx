import { useTranslation } from 'react-i18next';

export interface SiteOption {
  id: number;
  name: string;
}

export function SiteContextSwitcher({
  sites,
  activeSiteId,
  onSelect,
}: {
  sites: readonly SiteOption[];
  activeSiteId: number | null;
  onSelect: (siteId: number) => void;
}) {
  const { t } = useTranslation();
  if (sites.length <= 1) return null;
  const activeSite = sites.find((site) => site.id === activeSiteId) ?? sites[0];
  return (
    <details className="site-switcher">
      <summary aria-label={t('site.change')}>
        <span aria-hidden="true">⌂</span>
        <span>
          <small>Site actif</small>
          <strong>{activeSite?.name}</strong>
        </span>
        <span aria-hidden="true">▾</span>
      </summary>
      <div className="site-menu">
        {sites.map((site) => (
          <button
            key={site.id}
            type="button"
            aria-current={site.id === activeSiteId ? 'true' : undefined}
            onClick={(event) => {
              onSelect(site.id);
              event.currentTarget.closest('details')?.removeAttribute('open');
            }}
          >
            {site.name}
          </button>
        ))}
      </div>
    </details>
  );
}
