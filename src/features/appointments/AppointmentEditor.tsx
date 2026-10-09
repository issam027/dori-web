import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { QueueResponseDto } from '@/api/generated/models';
import { registrationsControllerGetAvailability } from '@/api/generated/registrations/registrations';
import { serviceTiersControllerFindTiers } from '@/api/generated/tiers/tiers';
import { Modal } from '@/design-system/components/Modal';
import { PersonPickerOrCreate, type PersonChoice } from '@/features/persons/PersonPickerOrCreate';
import { createAppointment } from './appointment-actions';
import { appointmentUtcIso } from './appointment-rules';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';

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
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [person, setPerson] = useState<PersonChoice | null>(null);
  const [queueId, setQueueId] = useState(queues[0]?.queueId ?? 0);
  const [tierId, setTierId] = useState(0);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime ?? '09:00');
  const [error, setError] = useState('');
  const tiers = useQuery({
    queryKey: ['tiers'],
    queryFn: () => serviceTiersControllerFindTiers({ page: 1, pageSize: 100 }),
  });
  const availability = useQuery({
    queryKey: ['availability', queueId, date],
    queryFn: () => registrationsControllerGetAvailability(queueId, { date }),
    enabled: queueId > 0 && Boolean(date),
  });
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
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
      notify({ tone: 'success', title: 'Rendez-vous créé', message: 'Le rendez-vous a bien été enregistré.' });
      onOpenChange(false);
    } catch (cause) {
      notifyError(cause);
      if ((cause as { status?: number }).status === 409) {
        setError('Ce créneau vient d’être réservé. Les disponibilités ont été actualisées.');
        await availability.refetch();
      } else setError('Création impossible.');
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
      title="Nouveau rendez-vous"
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
              ← Personne
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
              Continuer →
            </button>
          ) : (
            <button
              className="button button-primary"
              type="button"
              disabled={!person || !queueId || !tierId}
              onClick={() => void submit()}
            >
              Créer le rendez-vous
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
                <h3>Qui souhaitez-vous recevoir ?</h3>
                <p>Recherchez une personne existante ou saisissez ses coordonnées.</p>
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
                <small>Personne sélectionnée</small>
                <strong>{personLabel}</strong>
                <span>{person?.kind === 'existing' ? 'Fiche existante' : 'Nouvelle personne'}</span>
              </div>
              <button
                className="button button-small"
                type="button"
                onClick={() => {
                  setStep(1);
                }}
              >
                Modifier
              </button>
            </div>
            <div className="appointment-step-heading">
              <span className="ticket-chip">2</span>
              <div>
                <h3>Service et créneau</h3>
                <p>Choisissez la file, le niveau de service et une disponibilité.</p>
              </div>
            </div>
            <div className="form-grid">
              <label>
                File
                <select
                  value={queueId}
                  onChange={(e) => {
                    setQueueId(Number(e.target.value));
                  }}
                >
                  <option value={0}>Choisir</option>
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
                Forfait
                <select
                  value={tierId}
                  onChange={(e) => {
                    setTierId(Number(e.target.value));
                  }}
                >
                  <option value={0}>Choisir</option>
                  {tiers.data?.data.items.map((tier) => (
                    <option key={tier.tierId} value={tier.tierId}>
                      {tier.tierName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                  }}
                />
              </label>
              <label>
                Créneau
                <select
                  value={effectiveTime}
                  onChange={(e) => {
                    setTime(e.target.value.slice(11, 16));
                  }}
                >
                  {slots.map((slot) => (
                    <option key={slot.time} value={slotTime(slot.time)}>
                      {slotTime(slot.time)} ({slot.available} place(s))
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
