import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RegistrationResponseDto } from '@/api/generated/models';
import { invalidateAppointments } from '@/api/client/query-invalidations';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { Modal } from '@/design-system/components/Modal';
import { useAddPersonNote, usePerson } from '@/features/persons/hooks/usePersons';
import {
  appointmentLocalParts,
  appointmentStatusKey,
  appointmentUtcIso,
  appointmentVisualStatus,
  canCheckIn,
  canManageAppointment,
  dateInTimeZone,
} from './appointment-rules';
import {
  cancelAppointment,
  checkInAppointment,
  rescheduleAppointment,
} from './appointment-actions';
import { useAvailability } from './hooks/useAppointments';

type ActionMode = 'summary' | 'reschedule' | 'cancel';
const slotTime = (value: string) => (value.includes('T') ? value.slice(11, 16) : value.slice(0, 5));

export function AppointmentActionDialog({
  appointment,
  queueName,
  open,
  onOpenChange,
  timeZone,
}: {
  appointment: RegistrationResponseDto;
  queueName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeZone: string;
}) {
  const { t } = useTranslation();
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
  const availability = useAvailability(appointment.queueId, date);
  const slots = availability.data?.data.slots.filter((slot) => slot.isAvailable) ?? [];
  const manageable = canManageAppointment(appointment);
  const checkInAllowed = canCheckIn(appointment, dateInTimeZone(timeZone));
  const details = person.data?.data;
  const personName = details
    ? [details.firstName, details.lastName].filter((part) => part.trim().length > 0).join(' ')
    : t('appointments.calendar.unknownPerson');

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

  const actions =
    mode === 'summary' ? (
      <>
        <button
          className="button button-primary"
          type="button"
          disabled={!checkInAllowed || pending}
          onClick={() => {
            void perform({
              action: () => checkInAppointment(appointment.registrationId),
              successMessage: t('appointments.actions.presentSuccess'),
            });
          }}
        >
          {t('appointments.actions.markPresent')}
        </button>
        <button
          className="button"
          type="button"
          disabled={!manageable || pending}
          onClick={() => {
            setMode('reschedule');
          }}
        >
          {t('appointments.actions.reschedule')}
        </button>
        <button
          className="button button-danger"
          type="button"
          disabled={!manageable || pending}
          onClick={() => {
            setMode('cancel');
          }}
        >
          {t('appointments.actions.cancelAppointment')}
        </button>
      </>
    ) : mode === 'cancel' ? (
      <>
        <button className="button" type="button" disabled={pending} onClick={goBack}>
          {t('common.previous')}
        </button>
        <button
          className="button button-danger"
          type="button"
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
          {pending ? t('common.loading') : t('appointments.actions.confirmCancellation')}
        </button>
      </>
    ) : (
      <>
        <button className="button" type="button" disabled={pending} onClick={goBack}>
          {t('common.previous')}
        </button>
        <button
          className="button button-primary"
          type="button"
          disabled={!time || pending}
          onClick={() => {
            void perform({
              action: () =>
                rescheduleAppointment(appointment.registrationId, {
                  scheduledTime: appointmentUtcIso(date, time, timeZone),
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
          {pending ? t('common.loading') : t('appointments.actions.confirmReschedule')}
        </button>
      </>
    );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('appointments.actions.title', { ticket: appointment.ticketNumber })}
      description={
        mode === 'summary'
          ? t('appointments.actions.description')
          : mode === 'cancel'
            ? t('appointments.actions.cancelStepDescription')
            : t('appointments.actions.rescheduleStepDescription')
      }
      actions={actions}
    >
      <div className="appointment-details-dialog">
        <div className="wizard-track appointment-action-track" aria-hidden="true">
          <span className="done" />
          <span className={mode === 'summary' ? '' : 'done'} />
        </div>

        {mode === 'summary' ? (
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
              <span
                className={`appointment-status-pill appointment-status-${appointmentVisualStatus(appointment)}`}
              >
                {t(appointmentStatusKey(appointment))}
              </span>
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
                const value = slotTime(slot.time);
                return (
                  <button
                    className="button"
                    aria-pressed={time === value}
                    type="button"
                    key={slot.time}
                    onClick={() => {
                      setTime(value);
                    }}
                  >
                    {value}
                    <small>{t('appointments.actions.remaining', { count: slot.available })}</small>
                  </button>
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
