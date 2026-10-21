import { useTranslation } from 'react-i18next';
import { Button } from '@/design-system/components/Button';

const days = [1, 2, 3, 4, 5, 6, 7] as const;

export function WorkingDaysField({
  value,
  onChange,
  allowInheritance = false,
}: {
  value: number[] | null | undefined;
  onChange: (value: number[] | null) => void;
  allowInheritance?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const inherited = allowInheritance && value == null;
  const selected = inherited ? [] : (value ?? []);
  const dayName = (day: number, format: 'short' | 'long') =>
    new Intl.DateTimeFormat(i18n.language, { weekday: format, timeZone: 'UTC' }).format(
      new Date(Date.UTC(2024, 0, day)),
    );

  return (
    <fieldset className="tier-options-fieldset form-span">
      <legend>{t('common.workingDays', { defaultValue: 'Jours ouvrés' })}</legend>
      {allowInheritance ? (
        <label className="check-row">
          <input
            type="checkbox"
            checked={inherited}
            onChange={(event) => {
              onChange(event.target.checked ? null : [1, 2, 3, 4, 5]);
            }}
          />
          <span>{t('queues.queueEditor.heriterDuSite')}</span>
        </label>
      ) : null}
      <div
        className="segmented working-days-segmented"
        aria-label={t('common.workingDays', { defaultValue: 'Jours ouvrés' })}
      >
        {days.map((day) => (
          <Button
            variant="unstyled"
            key={day}
            aria-label={dayName(day, 'long')}
            aria-pressed={selected.includes(day)}
            disabled={inherited}
            onClick={() => {
              const next = !selected.includes(day)
                ? [...selected, day].sort((left, right) => left - right)
                : selected.filter((item) => item !== day);
              onChange(next);
            }}
          >
            {dayName(day, 'short')}
          </Button>
        ))}
      </div>
      <small>
        {inherited
          ? t('common.workingDaysInherited', { defaultValue: 'Les jours du site seront utilisés.' })
          : t('common.workingDaysHelp', {
              defaultValue: 'Sélectionnez au moins un jour d’ouverture.',
            })}
      </small>
    </fieldset>
  );
}
