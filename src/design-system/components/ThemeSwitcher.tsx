import { useTranslation } from 'react-i18next';
import { Moon, MoonStar, Sun, Sunrise } from 'lucide-react';
import { usePreferencesStore } from '@/core/theme/preferences-store';

export function ThemeSwitcher() {
  const { t } = useTranslation();
  const theme = usePreferencesStore((state) => state.theme);
  const cycleTheme = usePreferencesStore((state) => state.cycleTheme);
  const icon =
    theme === 'dark' ? (
      <Moon size={19} />
    ) : theme === 'soft-dark' ? (
      <MoonStar size={19} />
    ) : theme === 'soft-light' ? (
      <Sunrise size={19} />
    ) : (
      <Sun size={19} />
    );
  return (
    <button
      className="icon-button"
      type="button"
      onClick={cycleTheme}
      aria-label={t('theme.change')}
      title={t(`theme.${theme}`)}
    >
      <span className="theme-icon" aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}
