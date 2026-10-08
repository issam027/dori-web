import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { QueueResponseDto } from '@/api/generated/models';
import {
  registrationsControllerGetAvailability,
  registrationsControllerRegister,
} from '@/api/generated/registrations/registrations';
import { serviceTiersControllerFindTiers } from '@/api/generated/tiers/tiers';
import { Card } from '@/design-system/components/Card';
import { FormField } from '@/design-system/components/FormField';
import { PersonPickerOrCreate, type PersonChoice } from '@/features/persons/PersonPickerOrCreate';

export function QuickRegistration({
  siteId,
  queues,
}: {
  siteId: number;
  queues: readonly QueueResponseDto[];
}) {
  const queryClient = useQueryClient();
  const [choice, setChoice] = useState<PersonChoice | null>(null);
  const [queueId, setQueueId] = useState(queues[0]?.queueId ?? 0);
  const [tierId, setTierId] = useState(0);
  const [entryType, setEntryType] = useState<'walkin' | 'appointment'>('walkin');
  const [scheduledTime, setScheduledTime] = useState('');
  const [ticket, setTicket] = useState('');
  const [pending, setPending] = useState(false);
  const tiers = useQuery({
    queryKey: ['tiers'],
    queryFn: () => serviceTiersControllerFindTiers({ page: 1, pageSize: 100 }),
  });
  const availability = useQuery({
    queryKey: ['availability', queueId, scheduledTime.slice(0, 10)],
    queryFn: () =>
      registrationsControllerGetAvailability(queueId, { date: scheduledTime.slice(0, 10) }),
    enabled: entryType === 'appointment' && queueId > 0 && scheduledTime.length >= 10,
  });
  const submit = async () => {
    if (!choice || !queueId || !tierId) return;
    setPending(true);
    setTicket('');
    try {
      const response = await registrationsControllerRegister({
        queueId,
        tierId,
        entryType,
        scheduledTime:
          entryType === 'appointment' ? new Date(scheduledTime).toISOString() : undefined,
        ...(choice.kind === 'existing'
          ? { personId: choice.person.personId }
          : { person: choice.person }),
      });
      setTicket(response.data.ticketNumber);
      await queryClient.invalidateQueries({ queryKey: ['registrations'] });
    } finally {
      setPending(false);
    }
  };
  return (
    <Card>
      <h2>Accueil rapide</h2>
      <PersonPickerOrCreate siteId={siteId} value={choice} onChange={setChoice} />
      <div className="form-grid">
        <FormField label="File" required>
          <select
            value={queueId}
            onChange={(e) => {
              setQueueId(Number(e.target.value));
            }}
          >
            <option value={0}>Choisir</option>
            {queues.map((queue) => (
              <option key={queue.queueId} value={queue.queueId}>
                {queue.queueName}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Forfait" required>
          <select
            value={tierId}
            onChange={(e) => {
              setTierId(Number(e.target.value));
            }}
          >
            <option value={0}>Choisir</option>
            {tiers.data?.data.items
              .filter((tier) => tier.isActive)
              .map((tier) => (
                <option key={tier.tierId} value={tier.tierId}>
                  {tier.tierName}
                </option>
              ))}
          </select>
        </FormField>
        <FormField label="Type">
          <select
            value={entryType}
            onChange={(e) => {
              setEntryType(e.target.value as 'walkin' | 'appointment');
            }}
          >
            <option value="walkin">Sans rendez-vous</option>
            <option value="appointment">Rendez-vous</option>
          </select>
        </FormField>
        {entryType === 'appointment' ? (
          <FormField
            label="Créneau"
            hint={
              availability.isSuccess
                ? 'Disponibilités vérifiées'
                : 'Choisissez une date et une heure'
            }
          >
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => {
                setScheduledTime(e.target.value);
              }}
            />
          </FormField>
        ) : null}
      </div>
      <button
        className="button button-primary"
        disabled={
          pending ||
          !choice ||
          !queueId ||
          !tierId ||
          (entryType === 'appointment' && !scheduledTime)
        }
        onClick={() => {
          void submit();
        }}
      >
        Créer le ticket
      </button>
      {ticket ? (
        <p role="status">
          Ticket confirmé : <strong>{ticket}</strong>
        </p>
      ) : null}
    </Card>
  );
}
