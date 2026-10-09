import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { RegistrationResponseDto } from '@/api/generated/models';
import { registrationsControllerGetAvailability } from '@/api/generated/registrations/registrations';
import { serviceTiersControllerFindTiers } from '@/api/generated/tiers/tiers';
import { Modal } from '@/design-system/components/Modal';
import { appointmentLocalParts, appointmentUtcIso, canCheckIn } from './appointment-rules';
import {
  cancelAppointment,
  checkInAppointment,
  rescheduleAppointment,
  updateAppointment,
} from './appointment-actions';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';

export function AppointmentActionDialog({
  appointment,
  open,
  onOpenChange,
  timeZone,
}: {
  appointment: RegistrationResponseDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeZone: string;
}) {
  const queryClient = useQueryClient();
  const initialParts = appointment.scheduledTime
    ? appointmentLocalParts(appointment.scheduledTime, timeZone)
    : { date: appointment.businessDate, time: '09:00' };
  const initial = `${initialParts.date}T${initialParts.time}`;
  const [scheduledTime, setScheduledTime] = useState(initial);
  const [tierId, setTierId] = useState(appointment.tierId);
  const [languagePreference, setLanguagePreference] = useState('fr');
  const [error, setError] = useState('');
  const tiers = useQuery({
    queryKey: ['tiers'],
    queryFn: () => serviceTiersControllerFindTiers({ page: 1, pageSize: 100 }),
  });
  const availability = useQuery({
    queryKey: ['availability', appointment.queueId, scheduledTime.slice(0, 10)],
    queryFn: () =>
      registrationsControllerGetAvailability(appointment.queueId, {
        date: scheduledTime.slice(0, 10),
      }),
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['appointments'] });
    onOpenChange(false);
  };
  const mutate = async (
    action: () => Promise<unknown>,
    successMessage: string,
    slotSensitive = false,
  ) => {
    setError('');
    try {
      await action();
      await refresh();
      notify({ tone: 'success', title: 'Rendez-vous mis à jour', message: successMessage });
    } catch (cause) {
      notifyError(cause);
      if (slotSensitive && (cause as { status?: number }).status === 409) {
        setError('Créneau indisponible, disponibilités actualisées.');
        await availability.refetch();
      } else setError('Action impossible.');
    }
  };
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Rendez-vous ${appointment.ticketNumber}`}
    >
      <div className="form-stack">
        <label>
          Reprogrammer
          <input
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => {
              setScheduledTime(e.target.value);
            }}
          />
        </label>
        <button
          className="button"
          type="button"
          onClick={() => {
            void mutate(
              () =>
                rescheduleAppointment(appointment.registrationId, {
                  scheduledTime: appointmentUtcIso(
                    scheduledTime.slice(0, 10),
                    scheduledTime.slice(11, 16),
                    timeZone,
                  ),
                }),
              'Le rendez-vous a bien été reprogrammé.',
              true,
            );
          }}
        >
          Reprogrammer
        </button>
        <label>
          Forfait
          <select
            value={tierId}
            onChange={(e) => {
              setTierId(Number(e.target.value));
            }}
          >
            {tiers.data?.data.items.map((tier) => (
              <option key={tier.tierId} value={tier.tierId}>
                {tier.tierName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Langue
          <select
            value={languagePreference}
            onChange={(e) => {
              setLanguagePreference(e.target.value);
            }}
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
        </label>
        <button
          className="button"
          type="button"
          onClick={() => {
            void mutate(
              () =>
                updateAppointment(appointment.registrationId, {
                  tierId,
                  languagePreference,
                }),
              'Les informations du rendez-vous ont été enregistrées.',
            );
          }}
        >
          Enregistrer les modifications
        </button>
        {canCheckIn(appointment, new Date().toISOString().slice(0, 10)) ? (
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              void mutate(
                () => checkInAppointment(appointment.registrationId),
                'Le check-in a bien été enregistré.',
              );
            }}
          >
            Check-in
          </button>
        ) : null}
        <button
          className="button button-danger"
          type="button"
          onClick={() => {
            if (window.confirm('Annuler ce rendez-vous ?'))
              void mutate(
                () => cancelAppointment(appointment.registrationId),
                'Le rendez-vous a bien été annulé.',
              );
          }}
        >
          Annuler le rendez-vous
        </button>
        {error ? (
          <p role="alert" className="field-error">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
