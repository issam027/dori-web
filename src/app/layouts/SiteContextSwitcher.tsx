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
  if (sites.length <= 1)
    return sites[0] ? <strong className="site-name">{sites[0].name}</strong> : null;
  return (
    <label className="site-switcher">
      <span className="sr-only">{t('site.change')}</span>
      <select
        value={activeSiteId ?? ''}
        onChange={(event) => {
          onSelect(Number(event.target.value));
        }}
        aria-label={t('site.change')}
      >
        {sites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.name}
          </option>
        ))}
      </select>
    </label>
  );
}
