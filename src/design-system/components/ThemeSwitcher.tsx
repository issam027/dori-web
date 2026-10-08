import { useTranslation } from 'react-i18next';
import { usePreferencesStore } from '@/core/theme/preferences-store';

export function ThemeSwitcher() {
  const { t } = useTranslation();
  const theme = usePreferencesStore((state) => state.theme);
  const cycleTheme = usePreferencesStore((state) => state.cycleTheme);
  return (
    <button
      className="icon-button"
      type="button"
      onClick={cycleTheme}
      aria-label={t('theme.change')}
      title={t(`theme.${theme}`)}
    >
      ◐
    </button>
  );
}
