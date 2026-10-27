import { ArrowLeftRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function CockpitVersionSwitch({ version }: { version: 'new' | 'legacy' }) {
  const { t } = useTranslation();
  const legacy = version === 'legacy';
  const destination = legacy ? '/desk' : '/desk/legacy';
  const label = legacy ? t('cockpit.switchToNew') : t('cockpit.switchToLegacy');

  return (
    <Link className="button cockpit-version-switch" to={destination} title={label}>
      <ArrowLeftRight aria-hidden="true" />
      <span className="button-label">{label}</span>
    </Link>
  );
}
