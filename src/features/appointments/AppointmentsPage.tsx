import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { RegistrationResponseDto } from '@/api/generated/models';
import { queuesControllerFindAll } from '@/api/generated/queues/queues';
import { sitesControllerFindSite } from '@/api/generated/sites/sites';
import { personsControllerFindOne } from '@/api/generated/persons/persons';
import {
  registrationsControllerFindOne,
  registrationsControllerFindRegistrations,
} from '@/api/generated/registrations/registrations';
import { useScopeStore } from '@/core/scope/scope-store';
import { PageHeader } from '@/design-system/components/PageHeader';
import { AppointmentActionDialog } from './AppointmentActionDialog';
import { AppointmentEditor } from './AppointmentEditor';
import { appointmentLocalParts, isoDate, weekDates } from './appointment-rules';

function monthDates(anchor: Date): string[] {
  const first = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return isoDate(date);
  });
}

export function AppointmentsPage() {
  const siteId = useScopeStore((state) => state.activeSiteId);
  const [view, setView] = useState<'week' | 'month'>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [queueId, setQueueId] = useState(0);
  const [editor, setEditor] = useState<{ date: string; time?: string } | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const queues = useQuery({
    queryKey: ['queues', siteId, 'appointments'],
    queryFn: () =>
      queuesControllerFindAll({
        siteId: siteId ?? undefined,
        page: 1,
        pageSize: 100,
        isActive: true,
      }),
    enabled: siteId !== null,
  });
  const site = useQuery({
    queryKey: ['sites', siteId],
    queryFn: () => sitesControllerFindSite(siteId ?? 0),
    enabled: siteId !== null,
  });
  const availableQueues =
    queues.data?.data.items.filter((queue) => queue.appointmentsEnabled) ?? [];
  const selectedQueue =
    availableQueues.find((queue) => queue.queueId === queueId) ?? availableQueues[0];
  const timeZone = site.data?.data.timezone ?? 'UTC';
  const dates = useMemo(
    () => (view === 'week' ? weekDates(anchor) : monthDates(anchor)),
    [anchor, view],
  );
  const daily = useQueries({
    queries: dates.map((businessDate) => ({
      queryKey: ['appointments', selectedQueue?.queueId, businessDate],
      queryFn: () =>
        registrationsControllerFindRegistrations({
          queueId: selectedQueue?.queueId,
          siteId: siteId ?? undefined,
          businessDate,
          entryType: 'appointment',
          page: 1,
          pageSize: 100,
        }),
      enabled: Boolean(selectedQueue),
    })),
  });
  const selected = useQuery({
    queryKey: ['appointments', 'detail', selectedId],
    queryFn: () => registrationsControllerFindOne(selectedId ?? 0),
    enabled: selectedId !== null,
  });
  const appointmentPersonIds = [
    ...new Set(
      daily.flatMap((result) => result.data?.data.items.map((item) => item.personId) ?? []),
    ),
  ];
  const appointmentPeople = useQueries({
    queries: appointmentPersonIds.map((personId) => ({
      queryKey: ['persons', personId],
      queryFn: () => personsControllerFindOne(personId),
    })),
  });
  const personName = (personId: number) => {
    const person = appointmentPeople[appointmentPersonIds.indexOf(personId)]?.data?.data;
    return person ? `${person.firstName} ${person.lastName}` : 'Réservation';
  };
  const byDate = (date: string): RegistrationResponseDto[] =>
    daily[dates.indexOf(date)]?.data?.data.items ?? [];
  const hours = selectedQueue
    ? Array.from(
        {
          length: Math.max(
            1,
            Number(selectedQueue.workingHoursEnd.slice(0, 2)) -
              Number(selectedQueue.workingHoursStart.slice(0, 2)),
          ),
        },
        (_, index) =>
          `${String(Number(selectedQueue.workingHoursStart.slice(0, 2)) + index).padStart(2, '0')}:00`,
      )
    : [];
  const move = (amount: number) => {
    const next = new Date(anchor);
    next.setUTCDate(next.getUTCDate() + amount * (view === 'week' ? 7 : 30));
    setAnchor(next);
  };
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Planning"
        title="Rendez-vous"
        description="Données et disponibilités chargées depuis l’API."
        actions={
          <div className="segmented">
            <button
              className="button"
              type="button"
              aria-pressed={view === 'week'}
              onClick={() => {
                setView('week');
              }}
            >
              Semaine
            </button>
            <button
              className="button"
              type="button"
              aria-pressed={view === 'month'}
              onClick={() => {
                setView('month');
              }}
            >
              Mois
            </button>
          </div>
        }
      />
      {queues.isSuccess && availableQueues.length === 0 ? (
        <div className="card appointment-unavailable" role="status">
          <span className="ticket-chip" aria-hidden="true">
            ▦
          </span>
          <div>
            <h2>Rendez-vous indisponibles</h2>
            <p>
              Le site <strong>{site.data?.data.siteName ?? `#${String(siteId)}`}</strong> ne gère
              pas les rendez-vous.
            </p>
          </div>
        </div>
      ) : null}
      {availableQueues.length > 0 ? (
        <>
          <div className="calendar-toolbar">
            <select
              aria-label="File"
              value={selectedQueue?.queueId ?? 0}
              onChange={(e) => {
                setQueueId(Number(e.target.value));
              }}
            >
              {availableQueues.map((queue) => (
                <option key={queue.queueId} value={queue.queueId}>
                  {queue.queueName}
                </option>
              ))}
            </select>
            <button
              className="button"
              type="button"
              onClick={() => {
                move(-1);
              }}
            >
              Précédent
            </button>
            <strong>
              {dates[0]} — {dates.at(-1)}
            </strong>
            <button
              className="button"
              type="button"
              onClick={() => {
                move(1);
              }}
            >
              Suivant
            </button>
          </div>
          {view === 'week' ? (
            <div className="week-calendar">
              {dates.map((date) => (
                <section key={date} className="calendar-day">
                  <h2>{date}</h2>
                  {hours.map((time) => {
                    const isBreak = Boolean(
                      selectedQueue?.breakStart &&
                      selectedQueue.breakEnd &&
                      time >= selectedQueue.breakStart.slice(0, 5) &&
                      time < selectedQueue.breakEnd.slice(0, 5),
                    );
                    const appointments = byDate(date).filter(
                      (item) =>
                        item.scheduledTime &&
                        appointmentLocalParts(item.scheduledTime, timeZone).time.slice(0, 2) ===
                          time.slice(0, 2),
                    );
                    return (
                      <div
                        key={time}
                        className={
                          isBreak
                            ? 'calendar-slot calendar-break'
                            : appointments.length
                              ? 'calendar-slot'
                              : 'calendar-slot calendar-slot-empty'
                        }
                        role={!isBreak && !appointments.length ? 'button' : undefined}
                        tabIndex={!isBreak && !appointments.length ? 0 : undefined}
                        onClick={() => {
                          if (!isBreak && !appointments.length) setEditor({ date, time });
                        }}
                        onKeyDown={(event) => {
                          if (
                            !isBreak &&
                            !appointments.length &&
                            (event.key === 'Enter' || event.key === ' ')
                          ) {
                            event.preventDefault();
                            setEditor({ date, time });
                          }
                        }}
                      >
                        <span>{time}</span>
                        {isBreak ? (
                          <em>Pause</em>
                        ) : appointments.length ? (
                          appointments.map((item) => (
                            <button
                              className="calendar-event-button"
                              key={item.registrationId}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedId(item.registrationId);
                              }}
                            >
                              <strong>{personName(item.personId)}</strong>
                              <small>
                                {item.scheduledTime
                                  ? appointmentLocalParts(item.scheduledTime, timeZone).time
                                  : time}{' '}
                                · {item.ticketNumber}
                              </small>
                            </button>
                          ))
                        ) : null}
                      </div>
                    );
                  })}
                </section>
              ))}
            </div>
          ) : (
            <div className="month-calendar">
              {dates.map((date) => (
                <section
                  key={date}
                  className="month-day"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setEditor({ date });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') setEditor({ date });
                  }}
                >
                  <button
                    className="calendar-date-button"
                    type="button"
                    onClick={() => {
                      setEditor({ date });
                    }}
                  >
                    <strong>{date.slice(-2)}</strong>
                  </button>
                  {byDate(date).map((item) => (
                    <button
                      className="calendar-event-button"
                      key={item.registrationId}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedId(item.registrationId);
                      }}
                    >
                      {item.scheduledTime
                        ? appointmentLocalParts(item.scheduledTime, timeZone).time
                        : '—'}{' '}
                      · {personName(item.personId)}
                    </button>
                  ))}
                </section>
              ))}
            </div>
          )}
        </>
      ) : null}
      {editor && siteId !== null ? (
        <AppointmentEditor
          open
          onOpenChange={(open) => {
            if (!open) setEditor(null);
          }}
          siteId={siteId}
          queues={availableQueues}
          initialDate={editor.date}
          initialTime={editor.time}
          timeZone={timeZone}
        />
      ) : null}
      {selected.data ? (
        <AppointmentActionDialog
          appointment={selected.data.data}
          timeZone={timeZone}
          open
          onOpenChange={(open) => {
            if (!open) setSelectedId(null);
          }}
        />
      ) : null}
    </div>
  );
}
