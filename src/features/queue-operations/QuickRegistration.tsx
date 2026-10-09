import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { QueueResponseDto } from '@/api/generated/models';
import {
  registrationsControllerGetAvailability,
  registrationsControllerRegister,
} from '@/api/generated/registrations/registrations';
import { serviceTiersControllerFindTiers } from '@/api/generated/tiers/tiers';
import { sitesControllerFindSite } from '@/api/generated/sites/sites';
import { Card } from '@/design-system/components/Card';
import { FormField } from '@/design-system/components/FormField';
import { Modal } from '@/design-system/components/Modal';
import { PersonPickerOrCreate, type PersonChoice } from '@/features/persons/PersonPickerOrCreate';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { appointmentUtcIso } from '@/features/appointments/appointment-rules';

const slotTime = (value: string) => (value.includes('T') ? value.slice(11, 16) : value.slice(0, 5));

export function QuickRegistration({
  siteId,
  queues,
}: {
  siteId: number;
  queues: readonly QueueResponseDto[];
}) {
  const { t: __t } = useTranslation();
  const queryClient = useQueryClient();
  const [choice, setChoice] = useState<PersonChoice | null>(null);
  const [queueId, setQueueId] = useState(queues[0]?.queueId ?? 0);
  const [tierId, setTierId] = useState(0);
  const [entryType, setEntryType] = useState<'walkin' | 'appointment'>('walkin');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [ticket, setTicket] = useState('');
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const tiers = useQuery({
    queryKey: ['tiers'],
    queryFn: () => serviceTiersControllerFindTiers({ page: 1, pageSize: 100 }),
  });
  const site = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => sitesControllerFindSite(siteId),
  });
  const availability = useQuery({
    queryKey: ['availability', queueId, appointmentDate],
    queryFn: () => registrationsControllerGetAvailability(queueId, { date: appointmentDate }),
    enabled: entryType === 'appointment' && queueId > 0 && Boolean(appointmentDate),
  });
  const availableSlots = availability.data?.data.slots.filter((slot) => slot.isAvailable) ?? [];
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
          entryType === 'appointment'
            ? appointmentUtcIso(appointmentDate, appointmentTime, site.data?.data.timezone ?? 'UTC')
            : undefined,
        ...(choice.kind === 'existing'
          ? { personId: choice.person.personId }
          : { person: choice.person }),
      });
      setTicket(response.data.ticketNumber);
      setStep(3);
      await queryClient.invalidateQueries({ queryKey: ['registrations'] });
      notify({
        tone: 'success',
        title:
          entryType === 'appointment'
            ? __t('notifications.appointment.created')
            : __t('notifications.visit.queued'),
        message: __t('notifications.visit.ticketMessage', { ticket: response.data.ticketNumber }),
      });
    } catch (error) {
      notifyError(error);
    } finally {
      setPending(false);
    }
  };
  const canSubmit =
    !pending &&
    Boolean(choice) &&
    Boolean(queueId) &&
    Boolean(tierId) &&
    (entryType !== 'appointment' || Boolean(appointmentDate && appointmentTime));
  const personName = choice
    ? [choice.person.firstName, choice.person.lastName].filter(Boolean).join(' ')
    : '';
  const reset = () => {
    setStep(1);
    setChoice(null);
    setQueueId(queues[0]?.queueId ?? 0);
    setTierId(0);
    setEntryType('walkin');
    setAppointmentDate('');
    setAppointmentTime('');
    setTicket('');
  };
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) reset();
  };
  return (
    <>
      <Card className="quick-registration-launcher">
        <div>
          <p className="eyebrow">{__t('ui.queue-operations.quick_registration.accueil_lf64h9')}</p>
          <h2>{__t('ui.queue-operations.quick_registration.accueil_rapide_o49gqa')}</h2>
          <p>
            {__t(
              'ui.queue-operations.quick_registration.rechercher_ou_creer_une_personne_puis_generer_so_1vd7zg0',
            )}
          </p>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          {__t('ui.queue-operations.quick_registration.creer_un_ticket_2iit6s')}
        </button>
      </Card>
      <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title={__t('ui.queue-operations.quick_registration.accueil_rapide_o49gqa')}
        description={
          step === 1
            ? 'Étape 1 sur 3 · Rechercher ou créer la personne'
            : step === 2
              ? 'Étape 2 sur 3 · Qualifier le ticket'
              : 'Étape 3 sur 3 · Ticket créé'
        }
        actions={
          <>
            {step === 1 ? (
              <button
                className="button button-primary"
                type="button"
                disabled={!choice}
                onClick={() => {
                  setStep(2);
                }}
              >
                {__t('ui.queue-operations.quick_registration.continuer_vers_le_ticket_ydsvdz')}
              </button>
            ) : null}
            {step === 2 ? (
              <>
                <button
                  className="button"
                  type="button"
                  onClick={() => {
                    setStep(1);
                  }}
                >
                  {__t('ui.queue-operations.quick_registration.modifier_la_personne_1h5j199')}
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  disabled={!canSubmit}
                  onClick={() => void submit()}
                >
                  {pending
                    ? __t('ui.expression.queue-operations.quick_registration.creation_uqudte')
                    : __t(
                        'ui.expression.queue-operations.quick_registration.creer_le_ticket_hj5xhl',
                      )}
                </button>
              </>
            ) : null}
            {step === 3 ? (
              <button
                className="button button-primary"
                type="button"
                onClick={() => {
                  handleOpenChange(false);
                }}
              >
                {__t('ui.queue-operations.quick_registration.terminer_19zht57')}
              </button>
            ) : null}
          </>
        }
      >
        <div className="quick-registration-form">
          <div className="wizard-progress" aria-label={`Étape ${String(step)} sur 3`}>
            {[1, 2, 3].map((item) => (
              <span key={item} className={item <= step ? 'is-complete' : undefined} />
            ))}
          </div>
          {step === 1 ? (
            <section
              className="quick-registration-step"
              aria-label={__t(
                'ui.queue-operations.quick_registration.choix_de_la_personne_1kpwbrc',
              )}
            >
              <div className="wizard-step-heading">
                <span>1</span>
                <div>
                  <h3>
                    {__t('ui.queue-operations.quick_registration.qui_accueillez_vous_1mip4ik')}
                  </h3>
                  <p>
                    {__t(
                      'ui.queue-operations.quick_registration.retrouvez_un_dossier_existant_ou_creez_une_nouve_12icd6e',
                    )}
                  </p>
                </div>
              </div>
              <PersonPickerOrCreate siteId={siteId} value={choice} onChange={setChoice} />
            </section>
          ) : null}
          {step === 2 ? (
            <section
              className="quick-registration-step"
              aria-label={__t(
                'ui.queue-operations.quick_registration.qualification_du_ticket_a4e96j',
              )}
            >
              <div className="appointment-person-recap">
                <div className="person-avatar" aria-hidden="true">
                  {personName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <small>
                    {__t('ui.queue-operations.quick_registration.personne_selectionnee_1m33vg9')}
                  </small>
                  <strong>{personName}</strong>
                  <span>
                    {__t(
                      'ui.queue-operations.quick_registration.vous_pouvez_revenir_a_l_etape_precedente_pour_mo_edustt',
                    )}
                  </span>
                </div>
              </div>
              <div className="wizard-step-heading">
                <span>2</span>
                <div>
                  <h3>
                    {__t(
                      'ui.queue-operations.quick_registration.comment_preparer_son_passage_2zsr3c',
                    )}
                  </h3>
                  <p>
                    {__t(
                      'ui.queue-operations.quick_registration.selectionnez_la_file_le_niveau_de_service_et_le__19uxnpu',
                    )}
                  </p>
                </div>
              </div>
              <div className="form-grid">
                <FormField
                  label={__t('ui.queue-operations.quick_registration.file_bygjtv')}
                  required
                >
                  <select
                    value={queueId}
                    onChange={(e) => {
                      setQueueId(Number(e.target.value));
                      setAppointmentTime('');
                    }}
                  >
                    <option value={0}>
                      {__t('ui.queue-operations.quick_registration.choisir_4zi3t4')}
                    </option>
                    {queues.map((queue) => (
                      <option key={queue.queueId} value={queue.queueId}>
                        {queue.queueName}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField
                  label={__t('ui.queue-operations.quick_registration.forfait_ke31ak')}
                  required
                >
                  <select
                    value={tierId}
                    onChange={(e) => {
                      setTierId(Number(e.target.value));
                    }}
                  >
                    <option value={0}>
                      {__t('ui.queue-operations.quick_registration.choisir_4zi3t4')}
                    </option>
                    {tiers.data?.data.items
                      .filter((tier) => tier.isActive)
                      .map((tier) => (
                        <option key={tier.tierId} value={tier.tierId}>
                          {tier.tierName}
                        </option>
                      ))}
                  </select>
                </FormField>
                <FormField label={__t('ui.queue-operations.quick_registration.type_1m2zofh')}>
                  <select
                    value={entryType}
                    onChange={(e) => {
                      setEntryType(e.target.value as 'walkin' | 'appointment');
                      setAppointmentTime('');
                    }}
                  >
                    <option value="walkin">
                      {__t('ui.queue-operations.quick_registration.sans_rendez_vous_uzar0q')}
                    </option>
                    <option value="appointment">
                      {__t('ui.queue-operations.quick_registration.rendez_vous_1jmjhs7')}
                    </option>
                  </select>
                </FormField>
                {entryType === 'appointment' ? (
                  <FormField
                    label={__t(
                      'ui.queue-operations.quick_registration.date_du_rendez_vous_160bcww',
                    )}
                    required
                  >
                    <input
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => {
                        setAppointmentDate(e.target.value);
                        setAppointmentTime('');
                      }}
                    />
                  </FormField>
                ) : null}
                {entryType === 'appointment' && appointmentDate ? (
                  <FormField
                    label={__t('ui.queue-operations.quick_registration.heure_disponible_19g6px5')}
                    required
                    hint={
                      availability.isFetching
                        ? 'Chargement des disponibilités…'
                        : availableSlots.length
                          ? 'Créneaux retournés pour la date sélectionnée'
                          : 'Aucun créneau disponible pour cette date'
                    }
                  >
                    <select
                      value={appointmentTime}
                      disabled={availability.isFetching || availableSlots.length === 0}
                      onChange={(event) => {
                        setAppointmentTime(event.target.value);
                      }}
                    >
                      <option value="">
                        {__t('ui.queue-operations.quick_registration.choisir_une_heure_14eyqbt')}
                      </option>
                      {availableSlots.map((slot) => (
                        <option key={slot.time} value={slotTime(slot.time)}>
                          {slotTime(slot.time)} · {slot.available}{' '}
                          {__t('ui.queue-operations.quick_registration.place_s_11pxlwc')}
                        </option>
                      ))}
                    </select>
                  </FormField>
                ) : null}
              </div>
            </section>
          ) : null}
          {step === 3 && ticket ? (
            <section className="quick-registration-result" role="status">
              <span className="quick-registration-success" aria-hidden="true">
                ✓
              </span>
              <p className="eyebrow">
                {__t('ui.queue-operations.quick_registration.inscription_confirmee_kt7nz')}
              </p>
              <h3>{personName}</h3>
              <strong>{ticket}</strong>
              <p>
                {queues.find((queue) => queue.queueId === queueId)?.queueName} ·{' '}
                {entryType === 'appointment'
                  ? __t(
                      'ui.expression.queue-operations.quick_registration.rendez_vous_reserve_t3albf',
                    )
                  : __t('ui.expression.queue-operations.quick_registration.en_attente_1fzxwnp')}
              </p>
            </section>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
