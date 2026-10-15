import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import type { RegistrationResponseDto } from '@/api/generated/models';
import { useScopeStore } from '@/core/scope/scope-store';
import { PageHeader } from '@/design-system/components/PageHeader';
import { AppointmentActionDialog } from './AppointmentActionDialog';
import { AppointmentEditor } from './AppointmentEditor';
import {
  appointmentLocalParts,
  appointmentStatusKey,
  appointmentVisualStatus,
  isoDate,
  weekDates,
} from './appointment-rules';
import { useQueues } from '@/features/queues/hooks/useQueues';
import { useSite } from '@/features/portfolio/hooks/useSites';
import { usePersonsByIds } from '@/features/persons/hooks/usePersons';
import { useAppointment, useAppointments } from './hooks/useAppointments';

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
  const { t: __t } = useTranslation();
  const siteId = useScopeStore((state) => state.activeSiteId);
  const [view, setView] = useState<'week' | 'month'>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [queueId, setQueueId] = useState(0);
  const [editor, setEditor] = useState<{ date: string; time?: string } | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(() => new Set());
  const queues = useQueues({ siteId, isActive: true, usage: 'appointments' });
  const site = useSite(siteId);
  const availableQueues =
    queues.data?.data.items.filter((queue) => queue.appointmentsEnabled) ?? [];
  const selectedQueue =
    availableQueues.find((queue) => queue.queueId === queueId) ?? availableQueues[0];
  const timeZone = site.data?.data.timezone ?? 'UTC';
  const dates = useMemo(
    () => (view === 'week' ? weekDates(anchor) : monthDates(anchor)),
    [anchor, view],
  );
  const appointmentsQuery = useAppointments({ siteId, queueId: selectedQueue?.queueId, dates });
  const appointments = useMemo(
    () => appointmentsQuery.data ?? [],
    [appointmentsQuery.data],
  );
  const selected = useAppointment(selectedId);
  const appointmentPersonIds = useMemo(
    () => [...new Set(appointments.map((item) => item.personId))],
    [appointments],
  );
  const appointmentPeople = usePersonsByIds(appointmentPersonIds);
  const personName = (personId: number) => {
    const person = appointmentPeople[appointmentPersonIds.indexOf(personId)]?.data?.data;
    if (!person) return __t('appointments.calendar.unknownPerson');
    return [person.firstName, person.lastName].filter((part) => part.trim().length > 0).join(' ');
  };

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, RegistrationResponseDto[]>();
    for (const item of appointments) {
      const itemDate = item.scheduledTime
        ? appointmentLocalParts(item.scheduledTime, timeZone).date
        : item.businessDate;
      const current = map.get(itemDate);
      if (current) {
        current.push(item);
      } else {
        map.set(itemDate, [item]);
      }
    }
    return map;
  }, [appointments, timeZone]);

  const byDate = (date: string): RegistrationResponseDto[] =>
    appointmentsByDate.get(date) ?? [];

  const toggleSlot = (key: string) => {
    setExpandedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

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
        eyebrow={__t('nav.appointments')}
        title={__t('appointments.title')}
        description={__t('appointments.appointments.donneesEtDisponibilitesChargeesDepuisLApi')}
        actions={
          <div className="segmented">
            <button
              className={`button${view === 'week' ? ' button-primary' : ''}`}
              type="button"
              aria-pressed={view === 'week'}
              onClick={() => {
                setView('week');
              }}
            >
              {__t('appointments.appointments.semaine')}
            </button>
            <button
              className={`button${view === 'month' ? ' button-primary' : ''}`}
              type="button"
              aria-pressed={view === 'month'}
              onClick={() => {
                setView('month');
              }}
            >
              {__t('appointments.appointments.mois')}
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
            <h2>{__t('appointments.appointments.rendezVousIndisponibles')}</h2>
            <p>
              {__t('appointments.appointments.leSite')}
              <strong>
                {site.data?.data.siteName ??
                  __t('common.hashIdentifier', {
                    value0: String(siteId),
                  })}
              </strong>{' '}
              {__t('appointments.appointments.neGerePasLesRendezVous')}
            </p>
          </div>
        </div>
      ) : null}
      {availableQueues.length > 0 ? (
        <>
          <div className="calendar-toolbar">
            <select
              aria-label={__t('queues.singular')}
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
              {__t('appointments.appointments.precedent')}
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
              {__t('common.next')}
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
                    const slotAppointments = byDate(date).filter(
                      (item) =>
                        item.scheduledTime &&
                        appointmentLocalParts(item.scheduledTime, timeZone).time.slice(0, 2) ===
                          time.slice(0, 2),
                    );
                    const slotKey = `${date}_${time}`;
                    const isExpanded = expandedSlots.has(slotKey);
                    const visibleAppointments = isExpanded
                      ? slotAppointments
                      : slotAppointments.slice(0, 2);
                    const hasMore = slotAppointments.length > 2;

                    return (
                      <div
                        key={time}
                        className={
                          isBreak
                            ? 'calendar-slot calendar-break'
                            : slotAppointments.length
                              ? 'calendar-slot'
                              : 'calendar-slot calendar-slot-empty'
                        }
                        role={!isBreak ? 'button' : undefined}
                        tabIndex={!isBreak ? 0 : undefined}
                        onClick={() => {
                          if (!isBreak) setEditor({ date, time });
                        }}
                        onKeyDown={(event) => {
                          if (!isBreak && (event.key === 'Enter' || event.key === ' ')) {
                            event.preventDefault();
                            setEditor({ date, time });
                          }
                        }}
                      >
                        <div className="calendar-slot-header">
                          <span className="calendar-slot-time">{time}</span>
                          {slotAppointments.length > 0 && (
                            <span className="calendar-slot-count">
                              {slotAppointments.length}
                            </span>
                          )}
                        </div>
                        {isBreak ? (
                          <em>{__t('appointments.appointments.pause')}</em>
                        ) : slotAppointments.length ? (
                          <>
                            <div className={`calendar-slot-events${isExpanded ? ' is-expanded' : ''}`}>
                              {visibleAppointments.map((item) => {
                                const name = personName(item.personId);
                                const itemTime = item.scheduledTime
                                  ? appointmentLocalParts(item.scheduledTime, timeZone).time
                                  : time;
                                const statusText = __t(appointmentStatusKey(item));
                                return (
                                  <button
                                    className={`calendar-event-button appointment-status-${appointmentVisualStatus(item)}`}
                                    key={item.registrationId}
                                    type="button"
                                    title={`${name} (${itemTime}) · ${statusText}`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedId(item.registrationId);
                                    }}
                                  >
                                    <span className="appointment-status-dot" aria-hidden="true" />
                                    <span className="appointment-event-name">{name}</span>
                                  </button>
                                );
                              })}
                            </div>
                            {hasMore && (
                              <button
                                type="button"
                                className={`calendar-slot-more${isExpanded ? ' is-expanded' : ''}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleSlot(slotKey);
                                }}
                              >
                                {isExpanded ? (
                                  <>
                                    <span>{__t('appointments.calendar.collapse')}</span>
                                    <span aria-hidden="true">▴</span>
                                  </>
                                ) : (
                                  <>
                                    <span>
                                      {__t('appointments.calendar.moreCount', {
                                        count: slotAppointments.length - 2,
                                      })}
                                    </span>
                                    <span aria-hidden="true">▾</span>
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </section>
              ))}
            </div>
          ) : (
            <div className="month-calendar">
              {dates.map((date) => {
                const dayAppointments = byDate(date);
                const dayKey = date;
                const isExpanded = expandedSlots.has(dayKey);
                const visibleAppointments = isExpanded
                  ? dayAppointments
                  : dayAppointments.slice(0, 3);
                const hasMore = dayAppointments.length > 3;

                return (
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
                    <div className="month-day-header">
                      <button
                        className="calendar-date-button"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditor({ date });
                        }}
                      >
                        <strong>{date.slice(-2)}</strong>
                      </button>
                      {dayAppointments.length > 0 && (
                        <span className="calendar-slot-count">
                          {dayAppointments.length}
                        </span>
                      )}
                    </div>
                    <div className={`calendar-slot-events${isExpanded ? ' is-expanded' : ''}`}>
                      {visibleAppointments.map((item) => {
                        const name = personName(item.personId);
                        const itemTime = item.scheduledTime
                          ? appointmentLocalParts(item.scheduledTime, timeZone).time
                          : '—';
                        const statusText = __t(appointmentStatusKey(item));
                        return (
                          <button
                            className={`calendar-event-button appointment-status-${appointmentVisualStatus(item)}`}
                            key={item.registrationId}
                            type="button"
                            title={`${name} (${itemTime}) · ${statusText}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedId(item.registrationId);
                            }}
                          >
                            <span className="appointment-status-dot" aria-hidden="true" />
                            <span className="appointment-event-name">{name}</span>
                          </button>
                        );
                      })}
                    </div>
                    {hasMore && (
                      <button
                        type="button"
                        className={`calendar-slot-more${isExpanded ? ' is-expanded' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleSlot(dayKey);
                        }}
                      >
                        {isExpanded ? (
                          <>
                            <span>{__t('appointments.calendar.collapse')}</span>
                            <span aria-hidden="true">▴</span>
                          </>
                        ) : (
                          <>
                            <span>
                              {__t('appointments.calendar.moreCount', {
                                count: dayAppointments.length - 3,
                              })}
                            </span>
                            <span aria-hidden="true">▾</span>
                          </>
                        )}
                      </button>
                    )}
                  </section>
                );
              })}
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
          queueName={
            availableQueues.find((queue) => queue.queueId === selected.data.data.queueId)?.queueName
          }
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
