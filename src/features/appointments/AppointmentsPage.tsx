import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { PersonResponseDto, RegistrationResponseDto } from '@/api/generated/models';
import { useScopeStore } from '@/core/scope/scope-store';
import { PageHeader } from '@/design-system/components/PageHeader';
import { AppointmentActionDialog } from './AppointmentActionDialog';
import { AppointmentEditor } from './AppointmentEditor';
import {
  dateInTimeZone,
  appointmentLocalParts,
  appointmentStatusKey,
  appointmentVisualStatus,
  monthDates,
  weekDates,
} from './appointment-rules';
import { serviceTierVisualClass } from '@/design-system/service-tier';
import { useQueues } from '@/features/queues/hooks/useQueues';
import { useSite } from '@/features/portfolio/hooks/useSites';
import { useAppointment, useAppointments, useAvailabilityRange } from './hooks/useAppointments';
import { Button } from '@/design-system/components/Button';
import { DorifyLoader } from '@/design-system/components/DorifyLoader';
import { ErrorState } from '@/design-system/components/FeedbackState';

export function AppointmentsPage() {
  const { t: __t, i18n } = useTranslation();
  const siteId = useScopeStore((state) => state.activeSiteId);
  const [view, setView] = useState<'week' | 'month'>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [queueId, setQueueId] = useState('');
  const [editor, setEditor] = useState<{
    date: string;
    time?: string;
    person?: PersonResponseDto;
    queueId?: string;
    tierId?: string;
    startAtServiceStep?: boolean;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(() => new Set());
  const [now, setNow] = useState(() => new Date());
  const queues = useQueues({ siteId, isActive: true, usage: 'appointments' });
  const site = useSite(siteId);
  const availableQueues =
    queues.data?.data.items.filter((queue) => queue.appointmentsEnabled) ?? [];
  const selectedQueue =
    availableQueues.find((queue) => queue.queueId === queueId) ?? availableQueues[0];
  const pageTitle = selectedQueue
    ? `${__t('appointments.title')} — ${selectedQueue.queueName}`
    : __t('appointments.title');
  const timeZone = site.data?.data.timezone ?? 'UTC';
  const currentLocal = appointmentLocalParts(now.toISOString(), timeZone);
  const [currentHour, currentMinute = '0'] = currentLocal.time.split(':');
  const currentTimeProgress = `${String((Number(currentMinute) / 60) * 100)}%`;
  const displayedMonth = `${String(anchor.getUTCFullYear())}-${String(anchor.getUTCMonth() + 1).padStart(2, '0')}`;
  const displayedMonthLabel = new Intl.DateTimeFormat(i18n.language, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(anchor);
  const dates = useMemo(
    () => (view === 'week' ? weekDates(anchor) : monthDates(anchor)),
    [anchor, view],
  );
  const appointmentsQuery = useAppointments({ siteId, queueId: selectedQueue?.queueId, dates });
  const availabilityQuery = useAvailabilityRange(selectedQueue?.queueId, dates);
  const calendarLoading = appointmentsQuery.isPending || availabilityQuery.isPending;
  const calendarError = appointmentsQuery.isError || availabilityQuery.isError;
  const appointments = useMemo(() => appointmentsQuery.data ?? [], [appointmentsQuery.data]);
  const selected = useAppointment(selectedId);
  const personName = (appointment: RegistrationResponseDto) =>
    [appointment.firstName, appointment.lastName]
      .filter((part): part is string => Boolean(part?.trim()))
      .join(' ') || __t('appointments.calendar.unknownPerson');
  const weekday = (date: string) =>
    new Intl.DateTimeFormat(i18n.language, { weekday: 'long', timeZone: 'UTC' }).format(
      new Date(`${date}T00:00:00Z`),
    );

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

  const byDate = (date: string): RegistrationResponseDto[] => appointmentsByDate.get(date) ?? [];
  const availabilityByDate = new Map(
    (availabilityQuery.data?.data.days ?? []).map((day) => [day.businessDate, day]),
  );
  const isOpen = (date: string) => {
    const availability = availabilityByDate.get(date);
    if (availability) return availability.isOpen;
    const weekdayNumber = new Date(`${date}T00:00:00Z`).getUTCDay() || 7;
    return selectedQueue?.workingDays.includes(weekdayNumber) ?? true;
  };

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

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

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
    if (view === 'week') {
      next.setUTCDate(next.getUTCDate() + amount * 7);
    } else {
      next.setUTCDate(1);
      next.setUTCMonth(next.getUTCMonth() + amount);
    }
    setAnchor(next);
  };
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={__t('nav.appointments')}
        title={pageTitle}
        description={__t('appointments.appointments.donneesEtDisponibilitesChargeesDepuisLApi')}
        actions={
          <div className="segmented">
            <Button
              variant="unstyled"
              className={`button${view === 'week' ? ' button-primary' : ''}`}
              type="button"
              aria-pressed={view === 'week'}
              onClick={() => {
                setView('week');
              }}
            >
              {__t('appointments.appointments.semaine')}
            </Button>
            <Button
              variant="unstyled"
              className={`button${view === 'month' ? ' button-primary' : ''}`}
              type="button"
              aria-pressed={view === 'month'}
              onClick={() => {
                setView('month');
              }}
            >
              {__t('appointments.appointments.mois')}
            </Button>
          </div>
        }
      />
      {queues.isPending || site.isPending ? (
        <div className="appointment-calendar-loading">
          <DorifyLoader compact />
        </div>
      ) : null}
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
                    value0: siteId,
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
            {availableQueues.length > 1 ? (
              <select
                aria-label={__t('queues.singular')}
                value={selectedQueue?.queueId ?? ''}
                onChange={(e) => {
                  setQueueId(e.target.value);
                }}
              >
                {availableQueues.map((queue) => (
                  <option key={queue.queueId} value={queue.queueId}>
                    {queue.queueName}
                  </option>
                ))}
              </select>
            ) : null}
            <Button
              variant="unstyled"
              className="button"
              type="button"
              onClick={() => {
                move(-1);
              }}
            >
              {__t('appointments.appointments.precedent')}
            </Button>
            <strong>
              {view === 'month'
                ? displayedMonthLabel
                : [dates[0], dates.at(-1)].filter(Boolean).join(' — ')}
            </strong>
            <Button
              variant="unstyled"
              className="button"
              type="button"
              onClick={() => {
                move(1);
              }}
            >
              {__t('common.next')}
            </Button>
          </div>
          {calendarError ? (
            <ErrorState
              onRetry={() => {
                void Promise.all([appointmentsQuery.refetch(), availabilityQuery.refetch()]);
              }}
            />
          ) : calendarLoading ? (
            <div className="appointment-calendar-loading">
              <DorifyLoader compact />
            </div>
          ) : view === 'week' ? (
            <div className="week-calendar">
              {dates.map((date) => {
                const dayIsOpen = isOpen(date);
                const isToday = date === currentLocal.date;
                return (
                  <section
                    key={date}
                    className={`calendar-day${dayIsOpen ? '' : ' is-closed'}${isToday ? ' is-today' : ''}`}
                  >
                    <h2>
                      <span className="calendar-day-name">
                        {weekday(date)}
                        {isToday ? (
                          <span className="calendar-today-badge">
                            {__t('appointments.calendar.today')}
                          </span>
                        ) : null}
                      </span>
                      <span className="calendar-day-date">{date}</span>
                    </h2>
                    {!dayIsOpen ? (
                      <div className="calendar-closed-day">
                        <span>{__t('appointments.calendar.closed')}</span>
                      </div>
                    ) : (
                      hours.map((time) => {
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
                        const isCurrentSlot = isToday && time.slice(0, 2) === currentHour;

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
                            {isCurrentSlot ? (
                              <div
                                className="calendar-current-time"
                                style={
                                  {
                                    '--current-time-progress': currentTimeProgress,
                                  } as CSSProperties
                                }
                                aria-label={__t('appointments.calendar.currentTime', {
                                  time: currentLocal.time,
                                })}
                              >
                                <span>{currentLocal.time}</span>
                              </div>
                            ) : null}
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
                                <div
                                  className={`calendar-slot-events${isExpanded ? ' is-expanded' : ''}`}
                                >
                                  {visibleAppointments.map((item) => {
                                    const name = personName(item);
                                    const itemTime = item.scheduledTime
                                      ? appointmentLocalParts(item.scheduledTime, timeZone).time
                                      : time;
                                    const statusText = __t(appointmentStatusKey(item));
                                    return (
                                      <Button
                                        variant="unstyled"
                                        className={`calendar-event-button ${serviceTierVisualClass(item.tierId, item.tierName)} appointment-status-${appointmentVisualStatus(item)}`}
                                        key={item.registrationId}
                                        type="button"
                                        title={`${name} (${itemTime}) · ${statusText}${item.tierName ? ` · ${item.tierName}` : ''}`}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setSelectedId(item.registrationId);
                                        }}
                                      >
                                        <span
                                          className="appointment-status-dot"
                                          aria-hidden="true"
                                        />
                                        <span className="appointment-event-name">{name}</span>
                                      </Button>
                                    );
                                  })}
                                </div>
                                {hasMore && (
                                  <Button
                                    variant="unstyled"
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
                                  </Button>
                                )}
                              </>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="month-calendar">
              {dates.slice(0, 7).map((date) => (
                <div className="month-weekday-header" key={`weekday-${date}`}>
                  {weekday(date)}
                </div>
              ))}
              {dates.map((date) => {
                const dayAppointments = byDate(date);
                const dayIsOpen = isOpen(date);
                const dayKey = date;
                const isExpanded = expandedSlots.has(dayKey);
                const visibleAppointments = isExpanded
                  ? dayAppointments
                  : dayAppointments.slice(0, 3);
                const hasMore = dayAppointments.length > 3;
                const isToday = date === currentLocal.date;

                return (
                  <section
                    key={date}
                    className={`month-day${date.startsWith(displayedMonth) ? '' : ' is-outside-month'}${dayIsOpen ? '' : ' is-closed'}${isToday ? ' is-today' : ''}`}
                    role={dayIsOpen ? 'button' : undefined}
                    tabIndex={dayIsOpen ? 0 : undefined}
                    onClick={() => {
                      if (dayIsOpen) setEditor({ date });
                    }}
                    onKeyDown={(event) => {
                      if (dayIsOpen && (event.key === 'Enter' || event.key === ' '))
                        setEditor({ date });
                    }}
                  >
                    <div className="month-day-header">
                      {dayIsOpen ? (
                        <Button
                          variant="unstyled"
                          className="calendar-date-button"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditor({ date });
                          }}
                        >
                          <strong>{date.slice(-2)}</strong>
                        </Button>
                      ) : (
                        <strong>{date.slice(-2)}</strong>
                      )}
                      {dayAppointments.length > 0 && (
                        <span className="calendar-slot-count">{dayAppointments.length}</span>
                      )}
                      {isToday ? (
                        <span className="calendar-today-badge">
                          {__t('appointments.calendar.today')}
                        </span>
                      ) : null}
                    </div>
                    {!dayIsOpen ? (
                      <span className="calendar-closed-label">
                        {__t('appointments.calendar.closed')}
                      </span>
                    ) : null}
                    <div className={`calendar-slot-events${isExpanded ? ' is-expanded' : ''}`}>
                      {visibleAppointments.map((item) => {
                        const name = personName(item);
                        const itemTime = item.scheduledTime
                          ? appointmentLocalParts(item.scheduledTime, timeZone).time
                          : '—';
                        const statusText = __t(appointmentStatusKey(item));
                        return (
                          <Button
                            variant="unstyled"
                            className={`calendar-event-button ${serviceTierVisualClass(item.tierId, item.tierName)} appointment-status-${appointmentVisualStatus(item)}`}
                            key={item.registrationId}
                            type="button"
                            title={`${name} (${itemTime}) · ${statusText}${item.tierName ? ` · ${item.tierName}` : ''}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedId(item.registrationId);
                            }}
                          >
                            <span className="appointment-status-dot" aria-hidden="true" />
                            <span className="appointment-event-name">{name}</span>
                            <time className="appointment-event-time" dateTime={item.scheduledTime}>
                              {itemTime}
                            </time>
                          </Button>
                        );
                      })}
                    </div>
                    {hasMore && (
                      <Button
                        variant="unstyled"
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
                      </Button>
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
          initialPerson={editor.person}
          initialQueueId={editor.queueId}
          initialTierId={editor.tierId}
          startAtServiceStep={editor.startAtServiceStep}
        />
      ) : null}
      {selected.data ? (
        <AppointmentActionDialog
          appointment={selected.data.data}
          queueName={
            availableQueues.find((queue) => queue.queueId === selected.data.data.queueId)?.queueName
          }
          siteName={site.data?.data.siteName}
          timeZone={timeZone}
          open
          onCreateFollowUp={(context) => {
            setSelectedId(null);
            setEditor({
              date: dateInTimeZone(timeZone),
              person: context.person,
              queueId: context.queueId,
              tierId: context.tierId,
              startAtServiceStep: true,
            });
          }}
          onOpenChange={(open) => {
            if (!open) setSelectedId(null);
          }}
        />
      ) : null}
    </div>
  );
}
