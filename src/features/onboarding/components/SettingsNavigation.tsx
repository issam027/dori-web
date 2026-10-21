import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SETTINGS_SECTIONS, type SettingsSection } from '../settings-routes';

const sectionLabels: Record<SettingsSection, string> = {
  sites: 'sites.plural',
  queues: 'queues.plural',
  tiers: 'common.niveauxDeService',
};

export function SettingsNavigation({ active }: { active: SettingsSection }) {
  const { t } = useTranslation();
  return (
    <nav className="admin-tabs" aria-label={t('onboarding.settings.configurationDuService')}>
      {SETTINGS_SECTIONS.map((section) => (
        <Link
          className={active === section ? 'active' : ''}
          to={`/settings/${section}`}
          key={section}
        >
          {t(sectionLabels[section])}
        </Link>
      ))}
    </nav>
  );
}
