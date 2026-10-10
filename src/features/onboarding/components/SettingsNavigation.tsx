import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SETTINGS_SECTIONS, type SettingsSection } from '../settings-routes';

export function SettingsNavigation({ active }: { active: SettingsSection }) {
  const { t } = useTranslation();
  return (
    <nav className="admin-tabs" aria-label={t('ui.onboarding.settings_page.configuration_du_service_s0tb4b')}>
      {SETTINGS_SECTIONS.map((section) => (
        <Link
          className={active === section ? 'active' : ''}
          to={`/settings/${section}`}
          key={section}
        >
          {section === 'queues'
            ? t('ui.expression.onboarding.settings_page.files_1s4j38w')
            : section.charAt(0).toUpperCase() + section.slice(1)}
        </Link>
      ))}
    </nav>
  );
}
