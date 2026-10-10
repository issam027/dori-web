import { useTranslation } from 'react-i18next';
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
        setError(
          __t(
            'ui.expression.appointments.appointment_editor.ce_creneau_vient_d_etre_reserve_les_disponib_1bkik3g',
          ),
        );
        await availability.refetch();
      } else
        setError(__t('ui.expression.appointments.appointment_editor.creation_impossible_1g64rg5'));
    }
  };
  const slots = availability.data?.data.slots.filter((slot) => slot.isAvailable) ?? [];
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
      title={__t('ui.appointments.appointment_editor.nouveau_rendez_vous_1dqutse')}
      description={`Étape ${String(step)} sur 2 · ${step === 1 ? 'Personne' : 'Service et créneau'}`}
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
              {__t('ui.appointments.appointment_editor.personne_16xin39')}
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
              {__t('ui.appointments.appointment_editor.continuer_5vzly4')}
            </button>
          ) : (
            <button
              className="button button-primary"
              type="button"
              disabled={!person || !queueId || !tierId}
              onClick={() => void submit()}
            >
              {__t('ui.appointments.appointment_editor.creer_le_rendez_vous_1xjfxor')}
            </button>
          )}
        </>
      }
    >
      <div className="appointment-wizard">
        <div className="wizard-track" aria-label={`Étape ${String(step)} sur 2`}>
          <span className="done" />
          <span className={step === 2 ? 'done' : ''} />
        </div>
        {step === 1 ? (
          <div className="appointment-step">
            <div className="appointment-step-heading">
              <span className="ticket-chip">1</span>
              <div>
                <h3>
                  {__t('ui.appointments.appointment_editor.qui_souhaitez_vous_recevoir_1o2rz3u')}
                </h3>
                <p>
                  {__t(
                    'ui.appointments.appointment_editor.recherchez_une_personne_existante_ou_saisissez_s_1vsirzx',
                  )}
                </p>
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
                <small>
                  {__t('ui.appointments.appointment_editor.personne_selectionnee_1m33vg9')}
                </small>
                <strong>{personLabel}</strong>
                <span>
                  {person?.kind === 'existing'
                    ? __t('ui.expression.appointments.appointment_editor.fiche_existante_18g8h45')
                    : __t('ui.expression.appointments.appointment_editor.nouvelle_personne_1mo0xl')}
                </span>
              </div>
              <button
                className="button button-small"
                type="button"
                onClick={() => {
                  setStep(1);
                }}
              >
                {__t('ui.appointments.appointment_editor.modifier_1s45w8g')}
              </button>
            </div>
            <div className="appointment-step-heading">
              <span className="ticket-chip">2</span>
              <div>
                <h3>{__t('ui.appointments.appointment_editor.service_et_creneau_1ml8wea')}</h3>
                <p>
                  {__t(
                    'ui.appointments.appointment_editor.choisissez_la_file_le_niveau_de_service_et_une_d_enig89',
                  )}
                </p>
              </div>
            </div>
            <div className="form-grid">
              <label>
                {__t('ui.appointments.appointment_editor.file_bygjtv')}
                <select
                  value={queueId}
                  onChange={(e) => {
                    setQueueId(Number(e.target.value));
                  }}
                >
                  <option value={0}>
                    {__t('ui.appointments.appointment_editor.choisir_4zi3t4')}
                  </option>
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
                {__t('ui.appointments.appointment_editor.forfait_ke31ak')}
                <select
                  value={tierId}
                  onChange={(e) => {
                    setTierId(Number(e.target.value));
                  }}
                >
                  <option value={0}>
                    {__t('ui.appointments.appointment_editor.choisir_4zi3t4')}
                  </option>
                  {tiers.data?.data.items.map((tier) => (
                    <option key={tier.tierId} value={tier.tierId}>
                      {tier.tierName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {__t('ui.appointments.appointment_editor.date_ggjuyh')}
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                  }}
                />
              </label>
              <label>
                {__t('ui.appointments.appointment_editor.creneau_7gzdko')}
                <select
                  value={effectiveTime}
                  onChange={(e) => {
                    setTime(e.target.value.slice(11, 16));
                  }}
                >
                  {slots.map((slot) => (
                    <option key={slot.time} value={slotTime(slot.time)}>
                      {slotTime(slot.time)} ({slot.available}{' '}
                      {__t('ui.appointments.appointment_editor.place_s_fej3an')}
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
