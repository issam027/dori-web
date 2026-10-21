import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCircle2,
  Printer,
  Save,
  UserCheck,
} from 'lucide-react';
import type { PersonResponseDto, RegistrationResponseDto } from '@/api/generated/models';
import { invalidateAppointments } from '@/api/client/query-invalidations';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { Modal } from '@/design-system/components/Modal';
import { TrackingQr } from '@/features/public-experiences/TrackingQr';
import { trackingUrlFromToken } from '@/features/public-experiences/tracking-url';
import { KioskTicketPrintDocument } from '@/features/public-experiences/components/kiosk/KioskTicketPrintDocument';
import { useAddPersonNote } from '@/features/notes/hooks/usePersonNotes';
import { usePerson } from '@/features/persons/hooks/usePersons';
import {
  appointmentLocalParts,
  appointmentStatusKey,
  appointmentUtcIso,
  appointmentVisualStatus,
  canCheckIn,
  canManageAppointment,
  dateInTimeZone,
  isSlotAvailable,
  isTerminalAppointment,
  slotTime,
} from './appointment-rules';
import { serviceTierVisualClass } from '@/design-system/service-tier';
import {
  cancelAppointment,
  checkInAppointment,
  rescheduleAppointment,
} from './appointment-actions';
import { useAvailability } from './hooks/useAppointments';
import { Button } from '@/design-system/components/Button';
import { printDocument } from '@/shared/printing/print-document';

type ActionMode = 'summary' | 'reschedule' | 'cancel';

export function AppointmentActionDialog({
  appointment,
  queueName,
  siteName,
  open,
  onOpenChange,
  timeZone,
  onCreateFollowUp,
}: {
  appointment: RegistrationResponseDto;
  queueName?: string;
  siteName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeZone: string;
  onCreateFollowUp?: (context: {
    person: PersonResponseDto;
    queueId: number;
    tierId: number;
  }) => void;
}) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const person = usePerson(appointment.personId);
  const addNote = useAddPersonNote(appointment.personId);
  const initial = appointment.scheduledTime
    ? appointmentLocalParts(appointment.scheduledTime, timeZone)
    : { date: appointment.businessDate, time: '09:00' };
  const [mode, setMode] = useState<ActionMode>('summary');
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [cancellationReason, setCancellationReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [checkedIn, setCheckedIn] = useState<RegistrationResponseDto>();
  const [printReady, setPrintReady] = useState(false);
  const availability = useAvailability(appointment.queueId, date, mode === 'reschedule');
  const serviceTimeZone = availability.data?.data.timezone || timeZone;
  const day =
    availability.data?.data.days.find((d) => d.businessDate === date) ??
    availability.data?.data.days[0];
  const slots = day?.slots?.filter(isSlotAvailable) ?? [];
  const manageable = canManageAppointment(appointment);
  const checkInAllowed = canCheckIn(appointment, dateInTimeZone(timeZone), initial.date);
  const details = person.data?.data;
  const personName = details
    ? [details.firstName, details.lastName].filter((part) => part.trim().length > 0).join(' ')
    : t('appointments.calendar.unknownPerson');
  const checkedInTrackingUrl = trackingUrlFromToken(
    checkedIn?.registrationTrackingToken || appointment.registrationTrackingToken,
  );
  const treatmentCompletedAt = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(appointment.updatedAt));

  const perform = async ({
    action,
    successMessage,
    note,
    slotSensitive = false,
  }: {
    action: () => Promise<unknown>;
    successMessage: string;
    note?: string;
    slotSensitive?: boolean;
  }) => {
    setPending(true);
    setError('');
    try {
      await action();
    } catch (cause) {
      notifyError(cause);
      if (slotSensitive && (cause as { status?: number }).status === 409) {
        setError(t('appointments.actions.slotConflict'));
        await availability.refetch();
      } else {
        setError(t('appointments.actions.failed'));
      }
      setPending(false);
      return;
    }

    if (note) {
      try {
        await addNote.execute(note);
      } catch (cause) {
        notifyError(cause);
        notify({
          tone: 'warning',
          title: t('appointments.actions.noteFailedTitle'),
          message: t('appointments.actions.noteFailedText'),
        });
      }
    }

    await invalidateAppointments(queryClient);
    notify({
      tone: 'success',
      title: t('notifications.appointment.updated'),
      message: successMessage,
    });
    setPending(false);
    onOpenChange(false);
  };

  const goBack = () => {
    setError('');
    setMode('summary');
  };

  const checkIn = async () => {
    setPending(true);
    setError('');
    try {
      const response = await checkInAppointment(appointment.registrationId);
      await invalidateAppointments(queryClient);
      setCheckedIn(response.data);
      notify({
        tone: 'success',
        title: t('notifications.appointment.updated'),
        message: t('appointments.actions.presentSuccess'),
      });
    } catch (cause) {
      notifyError(cause);
      setError(t('appointments.actions.failed'));
    } finally {
      setPending(false);
    }
  };

  const actions = checkedIn ? (
    <>
      <Button
        variant="unstyled"
        className="button button-small"
        type="button"
        disabled={!printReady}
        onClick={() => {
          printDocument({ datasetKey: 'printKioskTicket' });
        }}
      >
        <Printer aria-hidden="true" />
        <span className="button-label">{t('public-experiences.kiosk.imprimerMonTicket')}</span>
      </Button>
      <Button
        variant="unstyled"
        className="button button-small button-primary"
        type="button"
        onClick={() => {
          onOpenChange(false);
        }}
      >
        <Check aria-hidden="true" />
        <span className="button-label">{t('common.terminer')}</span>
      </Button>
    </>
  ) : mode === 'summary' ? (
    <>
      {manageable ? (
        <>
          {checkInAllowed ? (
            <Button
              variant="unstyled"
              className="button button-small button-primary"
              type="button"
              title={t('appointments.actions.markPresent')}
              disabled={pending}
              onClick={() => {
                void checkIn();
              }}
            >
              <UserCheck aria-hidden="true" />
              <span className="button-label">{t('appointments.actions.markPresent')}</span>
            </Button>
          ) : null}
          <Button
            variant="unstyled"
            className="button button-small"
            type="button"
            title={t('appointments.actions.reschedule')}
            disabled={pending}
            onClick={() => {
              setMode('reschedule');
            }}
          >
            <CalendarClock aria-hidden="true" />
            <span className="button-label">{t('appointments.actions.reschedule')}</span>
          </Button>
          <Button
            variant="unstyled"
            className="button button-small button-danger"
            type="button"
            title={t('appointments.actions.cancelAppointment')}
            disabled={pending}
            onClick={() => {
              setMode('cancel');
            }}
          >
            <Ban aria-hidden="true" />
            <span className="button-label">{t('appointments.actions.cancelAppointment')}</span>
          </Button>
        </>
      ) : null}
      {isTerminalAppointment(appointment) && details && onCreateFollowUp ? (
        <Button
          variant="unstyled"
          className="button button-small button-primary"
          type="button"
          onClick={() => {
            onCreateFollowUp({
              person: details,
              queueId: appointment.queueId,
              tierId: appointment.tierId,
            });
          }}
        >
          <CalendarPlus aria-hidden="true" />
          <span className="button-label">{t('appointments.actions.createFollowUp')}</span>
        </Button>
      ) : null}
    </>
  ) : mode === 'cancel' ? (
    <>
      <Button
        variant="unstyled"
        className="button button-small"
        type="button"
        labelMode="responsive"
        title={t('common.previous')}
        disabled={pending}
        onClick={goBack}
      >
        <ArrowLeft aria-hidden="true" />
        <span className="button-label">{t('common.previous')}</span>
      </Button>
      <Button
        variant="unstyled"
        className="button button-small button-danger"
        type="button"
        title={t('appointments.actions.confirmCancellation')}
        disabled={!cancellationReason.trim() || pending}
        onClick={() => {
          void perform({
            action: () => cancelAppointment(appointment.registrationId),
            successMessage: t('appointments.actions.cancelSuccess'),
            note: t('appointments.notes.cancelled', {
              ticket: appointment.ticketNumber,
              date: initial.date,
              time: initial.time,
              reason: cancellationReason.trim(),
            }),
          });
        }}
      >
        <Ban aria-hidden="true" />
        <span className="button-label">
          {pending ? t('common.loading') : t('appointments.actions.confirmCancellation')}
        </span>
      </Button>
    </>
  ) : (
    <>
      <Button
        variant="unstyled"
        className="button button-small"
        type="button"
        labelMode="responsive"
        title={t('common.previous')}
        disabled={pending}
        onClick={goBack}
      >
        <ArrowLeft aria-hidden="true" />
        <span className="button-label">{t('common.previous')}</span>
      </Button>
      <Button
        variant="unstyled"
        className="button button-small button-primary"
        type="button"
        title={t('appointments.actions.confirmReschedule')}
        disabled={!time || pending}
        onClick={() => {
          void perform({
            action: () =>
              rescheduleAppointment(appointment.registrationId, {
                scheduledTime: appointmentUtcIso(date, time, serviceTimeZone),
              }),
            successMessage: t('appointments.actions.rescheduleSuccess'),
            note: t('appointments.notes.rescheduled', {
              ticket: appointment.ticketNumber,
              oldDate: initial.date,
              oldTime: initial.time,
              newDate: date,
              newTime: time,
            }),
            slotSensitive: true,
          });
        }}
      >
        <Save aria-hidden="true" />
        <span className="button-label">
          {pending ? t('common.loading') : t('appointments.actions.confirmReschedule')}
        </span>
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('appointments.actions.title', { ticket: appointment.ticketNumber })}
      description={
        checkedIn
          ? t('appointments.actions.checkInConfirmedDescription')
          : mode === 'summary'
            ? t('appointments.actions.description')
            : mode === 'cancel'
              ? t('appointments.actions.cancelStepDescription')
              : t('appointments.actions.rescheduleStepDescription')
      }
      hideDismissAction={Boolean(checkedIn)}
      actions={actions}
    >
      <div className="appointment-details-dialog">
        <div className="wizard-track appointment-action-track" aria-hidden="true">
          <span className="done" />
          <span className={mode === 'summary' ? '' : 'done'} />
        </div>

        {checkedIn ? (
          <section className="quick-registration-result" role="status">
            <div className="quick-registration-result-details">
              <span className="quick-registration-success" aria-hidden="true">
                <Check />
              </span>
              <p className="eyebrow">{t('common.registrationConfirmed')}</p>
              <h3>{personName}</h3>
              <strong>{checkedIn.ticketNumber}</strong>
              <p>
                {queueName} · {t('common.enAttente')}
              </p>
            </div>
            <div className="quick-registration-tracking">
              <TrackingQr value={checkedInTrackingUrl} />
              <p>{t('quickRegistration.trackingQrHelp')}</p>
            </div>
            <KioskTicketPrintDocument
              ticketNumber={checkedIn.ticketNumber}
              siteName={siteName}
              queueName={queueName}
              trackingUrl={checkedInTrackingUrl}
              onReady={() => {
                setPrintReady(true);
              }}
            />
          </section>
        ) : mode === 'summary' ? (
          <section className="appointment-record-panel">
            <div className="note-mode-heading appointment-record-heading">
              <span className="appointment-avatar" aria-hidden="true">
                {personName.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <small>{t('appointments.actions.person')}</small>
                <h3>{personName}</h3>
                <p>
                  {[details?.phoneNumber, details?.email].filter(Boolean).join(' · ') ||
                    t('appointments.actions.noContact')}
                </p>
              </div>
              <div className="appointment-record-badges">
                <span
                  className={`appointment-status-pill appointment-status-${appointmentVisualStatus(appointment)}`}
                >
                  {t(appointmentStatusKey(appointment))}
                </span>
                {appointment.tierName ? (
                  <span
                    className={`service-tier-badge ${serviceTierVisualClass(appointment.tierId, appointment.tierName)}`}
                  >
                    {appointment.tierName}
                  </span>
                ) : null}
              </div>
            </div>
            <dl className="appointment-details-list">
              <div>
                <dt>{t('appointments.actions.date')}</dt>
                <dd>{initial.date}</dd>
              </div>
              <div>
                <dt>{t('appointments.actions.time')}</dt>
                <dd>{initial.time}</dd>
              </div>
              <div>
                <dt>{t('appointments.actions.service')}</dt>
                <dd>{queueName ?? '—'}</dd>
              </div>
              <div>
                <dt>{t('appointments.actions.ticket')}</dt>
                <dd>{appointment.ticketNumber}</dd>
              </div>
            </dl>
            {appointment.status === 'served' ? (
              <div className="appointment-treatment-summary">
                <CheckCircle2 aria-hidden="true" />
                <div>
                  <strong>{t('appointments.actions.treatmentCompleted')}</strong>
                  <span>
                    {t('appointments.actions.treatmentCompletedAt', { date: treatmentCompletedAt })}
                  </span>
                </div>
                <small>
                  {[
                    appointment.servedByUserId
                      ? t('appointments.actions.servedByOperator', {
                          id: appointment.servedByUserId,
                        })
                      : null,
                    appointment.servedBySessionId
                      ? t('appointments.actions.servedBySession', {
                          id: appointment.servedBySessionId,
                        })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </div>
            ) : null}
            {!checkInAllowed && manageable ? (
              <p className="appointment-action-hint">{t('appointments.actions.presentHint')}</p>
            ) : null}
          </section>
        ) : null}

        {mode === 'cancel' ? (
          <section className="note-editor-panel appointment-action-panel appointment-cancel-panel">
            <div className="note-mode-heading">
              <span className="note-icon" aria-hidden="true">
                !
              </span>
              <div>
                <h3>{t('appointments.actions.cancelConfirmTitle')}</h3>
                <p>
                  {t('appointments.actions.cancelConfirmText', {
                    name: personName,
                    date: initial.date,
                    time: initial.time,
                  })}
                </p>
              </div>
            </div>
            <label>
              {t('appointments.actions.cancellationReason')}
              <textarea
                rows={5}
                value={cancellationReason}
                placeholder={t('appointments.actions.cancellationReasonPlaceholder')}
                onChange={(event) => {
                  setCancellationReason(event.target.value);
                }}
              />
            </label>
            <small>{t('appointments.actions.cancellationNoteHint')}</small>
          </section>
        ) : null}

        {mode === 'reschedule' ? (
          <section className="appointment-action-panel appointment-reschedule-panel">
            <div className="note-mode-heading">
              <span className="note-icon" aria-hidden="true">
                2
              </span>
              <div>
                <h3>{t('appointments.actions.chooseSlot')}</h3>
                <p>{t('appointments.actions.rescheduleGuidance')}</p>
              </div>
            </div>
            <label>
              {t('appointments.actions.newDate')}
              <input
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setTime('');
                }}
              />
            </label>
            {availability.isPending ? <p>{t('common.loading')}</p> : null}
            {!availability.isPending && slots.length === 0 ? (
              <p>{t('appointments.actions.noSlots')}</p>
            ) : null}
            <div className="appointment-slot-grid">
              {slots.map((slot) => {
                const value = slotTime(slot.time, serviceTimeZone);
                return (
                  <Button
                    variant="unstyled"
                    className="button"
                    aria-pressed={time === value}
                    type="button"
                    key={slot.time}
                    disabled={!isSlotAvailable(slot)}
                    onClick={() => {
                      setTime(value);
                    }}
                  >
                    {value}
                    <small>{t('appointments.actions.remaining', { count: slot.available })}</small>
                  </Button>
                );
              })}
            </div>
            <small>{t('appointments.actions.rescheduleNoteHint')}</small>
          </section>
        ) : null}

        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
