import { useTranslation } from 'react-i18next';
import { ArrowRight, CalendarPlus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { QueueResponseDto } from '@/api/generated/models';
import { Modal } from '@/design-system/components/Modal';
import { PersonPickerOrCreate, type PersonChoice } from '@/features/persons/PersonPickerOrCreate';
import { createAppointment } from './appointment-actions';
import { appointmentUtcIso } from './appointment-rules';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { invalidateAppointments } from '@/api/client/query-invalidations';
import { useAppointmentTiers, useAvailability } from './hooks/useAppointments';

const slotTime = (value: string) => (value.includes('T') ? value.slice(11, 16) : value.slice(0, 5));

export function AppointmentEditor({
  open,
  onOpenChange,
  siteId,
  queues,
  initialDate,
  initialTime,
  timeZone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: number;
  queues: readonly QueueResponseDto[];
  initialDate: string;
  initialTime?: string;
  timeZone: string;
}) {
  const { t: __t } = useTranslation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [person, setPerson] = useState<PersonChoice | null>(null);
  const [queueId, setQueueId] = useState(queues[0]?.queueId ?? 0);
  const [tierId, setTierId] = useState(0);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime ?? '09:00');
  const [error, setError] = useState('');
  const tiers = useAppointmentTiers('appointment-editor');
  const availability = useAvailability(queueId, date);
  const submit = async () => {
    if (!person || !queueId || !tierId) return;
    setError('');
    try {
      await createAppointment({
        queueId,
        tierId,
        entryType: 'appointment',
        scheduledTime: appointmentUtcIso(date, effectiveTime, timeZone),
        ...(person.kind === 'existing'
          ? { personId: person.person.personId }
          : { person: person.person }),
      });
      await invalidateAppointments(queryClient);
      notify({
        tone: 'success',
        title: __t('notifications.appointment.created'),
        message: __t('notifications.appointment.createdMessage'),
      });
      onOpenChange(false);
    } catch (cause) {
      notifyError(cause);
      if ((cause as { status?: number }).status === 409) {
        setError(__t('appointments.appointmentEditor.ceCreneauVientDEtreReserveLesDisponib'));
        await availability.refetch();
      } else setError(__t('appointments.appointmentEditor.creationImpossible'));
    }
  };
  const slots = availability.data?.data.days[0]?.slots?.filter((slot) => slot.isAvailable) ?? [];
  const availableTimes = slots.map((slot) => slotTime(slot.time));
  const effectiveTime =
    availableTimes.find((candidate) => candidate === time) ??
    availableTimes.find((candidate) => candidate.slice(0, 2) === time.slice(0, 2)) ??
    availableTimes[0] ??
    time;
  const personLabel = person
    ? `${person.person.firstName ?? ''} ${person.person.lastName}`.trim()
    : '';
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={__t('appointments.appointmentEditor.nouveauRendezVous')}
      description={__t('appointments.appointmentEditor.stepDescription', {
        step: String(step),
        label:
          step === 1 ? __t('common.person') : __t('appointments.appointmentEditor.serviceAndSlot'),
      })}
      actions={
        <>
          {step === 2 ? (
            <button
              className="button"
              type="button"
              onClick={() => {
                setStep(1);
              }}
            >
              {__t('appointments.appointmentEditor.personne')}
            </button>
          ) : null}
          {step === 1 ? (
            <button
              className="button button-primary"
              type="button"
              disabled={!person}
              onClick={() => {
                setStep(2);
              }}
            >
              {__t('common.continuer')}
              <ArrowRight aria-hidden="true" />
            </button>
          ) : (
            <button
              className="button button-primary"
              type="button"
              disabled={!person || !queueId || !tierId}
              onClick={() => void submit()}
            >
              <CalendarPlus aria-hidden="true" />
              {__t('appointments.appointmentEditor.creerLeRendezVous')}
            </button>
          )}
        </>
      }
    >
      <div className="appointment-wizard">
        <div
          className="wizard-track"
          aria-label={__t('wizard.progress', { step: String(step), stepCount: '2' })}
        >
          <span className="done" />
          <span className={step === 2 ? 'done' : ''} />
        </div>
        {step === 1 ? (
          <div className="appointment-step">
            <div className="appointment-step-heading">
              <span className="ticket-chip">1</span>
              <div>
                <h3>{__t('appointments.appointmentEditor.quiSouhaitezVousRecevoir')}</h3>
                <p>{__t('appointments.editor.personSearchHint')}</p>
              </div>
            </div>
            <PersonPickerOrCreate siteId={siteId} value={person} onChange={setPerson} />
          </div>
        ) : (
          <div className="appointment-step">
            <div className="appointment-person-recap">
              <span className="appointment-avatar" aria-hidden="true">
                {personLabel.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <small>{__t('common.personneSelectionnee')}</small>
                <strong>{personLabel}</strong>
                <span>
                  {person?.kind === 'existing'
                    ? __t('appointments.appointmentEditor.ficheExistante')
                    : __t('common.nouvellePersonne')}
                </span>
              </div>
              <button
                className="button button-small"
                type="button"
                onClick={() => {
                  setStep(1);
                }}
              >
                {__t('common.edit')}
              </button>
            </div>
            <div className="appointment-step-heading">
              <span className="ticket-chip">2</span>
              <div>
                <h3>{__t('appointments.appointmentEditor.serviceEtCreneau')}</h3>
                <p>
                  {__t('appointments.appointmentEditor.choisissezLaFileLeNiveauDeServiceEtUneD')}
                </p>
              </div>
            </div>
            <div className="form-grid">
              <label>
                {__t('queues.singular')}
                <select
                  value={queueId}
                  onChange={(e) => {
                    setQueueId(Number(e.target.value));
                  }}
                >
                  <option value={0}>{__t('common.choose')}</option>
                  {queues
                    .filter((q) => q.appointmentsEnabled)
                    .map((q) => (
                      <option key={q.queueId} value={q.queueId}>
                        {q.queueName}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                {__t('common.tier')}
                <select
                  value={tierId}
                  onChange={(e) => {
                    setTierId(Number(e.target.value));
                  }}
                >
                  <option value={0}>{__t('common.choose')}</option>
                  {tiers.data?.data.items.map((tier) => (
                    <option key={tier.tierId} value={tier.tierId}>
                      {tier.tierName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {__t('common.date')}
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                  }}
                />
              </label>
              <label>
                {__t('appointments.appointmentEditor.creneau')}
                <select
                  value={effectiveTime}
                  onChange={(e) => {
                    setTime(slotTime(e.target.value));
                  }}
                >
                  {slots.map((slot) => (
                    <option key={slot.time} value={slotTime(slot.time)}>
                      {slotTime(slot.time)} ({slot.available}{' '}
                      {__t('appointments.appointmentEditor.placeS')})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {error ? (
              <p role="alert" className="field-error">
                {error}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  );
}
