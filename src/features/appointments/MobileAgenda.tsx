import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { RegistrationResponseDto } from '@/api/generated/models';
import { Button } from '@/design-system/components/Button';
import { EmptyState } from '@/design-system/components/FeedbackState';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { appointmentLocalParts, appointmentStatusKey, weekDates } from './appointment-rules';

export function MobileAgenda({
  date,
  today,
  timeZone,
  appointments,
  open,
  onDate,
  onCreate,
  onSelect,
}: {
  date: string;
  today: string;
  timeZone: string;
  appointments: readonly RegistrationResponseDto[];
  open: boolean;
  onDate: (date: string) => void;
  onCreate: () => void;
  onSelect: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const anchor = new Date(`${date}T12:00:00Z`);
  const label = (value: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(i18n.language, { ...options, timeZone: 'UTC' }).format(
      new Date(`${value}T12:00:00Z`),
    );
  const move = (amount: number) => {
    const next = new Date(anchor);
    next.setUTCDate(next.getUTCDate() + amount);
    onDate(next.toISOString().slice(0, 10));
  };
  return (
    <section className="mobile-agenda" aria-label={t('mobile.day')}>
      <div className="agenda-date-controls">
        <Button
          size="icon"
          icon={<ChevronLeft />}
          label={t('appointments.appointments.precedent')}
          labelMode="icon-only"
          onClick={() => {
            move(-1);
          }}
        />
        <label>
          {t('mobile.selectDate')}
          <input
            type="date"
            value={date}
            onChange={(event) => {
              if (event.target.value) onDate(event.target.value);
            }}
          />
        </label>
        <Button
          size="icon"
          icon={<ChevronRight />}
          label={t('common.next')}
          labelMode="icon-only"
          onClick={() => {
            move(1);
          }}
        />
      </div>
      <Button
        onClick={() => {
          onDate(today);
        }}
        icon={<CalendarDays />}
        label={t('appointments.calendar.today')}
      />
      <div className="agenda-days" role="group" aria-label={t('appointments.appointments.semaine')}>
        {weekDates(anchor).map((day) => (
          <Button
            key={day}
            aria-pressed={day === date}
            aria-label={label(day, { dateStyle: 'full' })}
            variant={day === date ? 'primary' : 'default'}
            onClick={() => {
              onDate(day);
            }}
          >
            <small>{label(day, { weekday: 'short' })}</small>
            <strong>{day.slice(-2)}</strong>
          </Button>
        ))}
      </div>
      <h2>{label(date, { dateStyle: 'full' })}</h2>
      {!open ? <p role="status">{t('appointments.calendar.closed')}</p> : null}
      {open ? (
        <Button
          variant="primary"
          icon={<Plus />}
          label={t('mobile.newAppointment')}
          onClick={onCreate}
        />
      ) : null}
      {appointments.length ? (
        <div className="agenda-list">
          {[...appointments]
            .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
            .map((item) => (
              <article className="card agenda-item" key={item.registrationId}>
                <time dateTime={item.scheduledTime}>
                  {item.scheduledTime
                    ? appointmentLocalParts(item.scheduledTime, timeZone).time
                    : '—'}
                </time>
                <div>
                  <strong>
                    {[item.firstName, item.lastName].filter(Boolean).join(' ') ||
                      t('appointments.calendar.unknownPerson')}
                  </strong>
                  <StatusBadge>{t(appointmentStatusKey(item))}</StatusBadge>
                  {item.tierName ? <small>{item.tierName}</small> : null}
                </div>
                <Button
                  onClick={() => {
                    onSelect(item.registrationId);
                  }}
                >
                  {t('common.view')}
                </Button>
              </article>
            ))}
        </div>
      ) : (
        <EmptyState title={t('mobile.noAppointments')} />
      )}
    </section>
  );
}
