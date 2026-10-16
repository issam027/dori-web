import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, Plus, Printer, TicketCheck } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { QueueResponseDto } from '@/api/generated/models';
import type { CreateRegistrationDto, CreateRegistrationResponseDto } from '@/api/generated/models';
import {
  findSite,
  getAvailability,
  getQueueTiers,
  registerPerson,
} from './api/quick-registration-api';
import { Card } from '@/design-system/components/Card';
import { FormField } from '@/design-system/components/FormField';
import { Modal } from '@/design-system/components/Modal';
import { PersonPickerOrCreate, type PersonChoice } from '@/features/persons/PersonPickerOrCreate';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { queryKeys } from '@/api/client/query-keys';
import { invalidateQueueOperations } from '@/api/client/query-invalidations';
import { appointmentUtcIso, isSlotAvailable, slotTime } from '@/features/appointments/appointment-rules';
import { TrackingQr } from '@/features/public-experiences/TrackingQr';
import { trackingUrlFromToken } from '@/features/public-experiences/tracking-url';
import { findPersons } from '@/features/persons/api/persons-api';
import { NormalizedApiError } from '@/core/errors/normalized-api-error';
import { KioskTicketPrintDocument } from '@/features/public-experiences/components/kiosk/KioskTicketPrintDocument';

export function QuickRegistration({
  siteId,
  queues,
}: {
  siteId: number;
  queues: readonly QueueResponseDto[];
}) {
  const { t: __t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [choice, setChoice] = useState<PersonChoice | null>(null);
  const [queueId, setQueueId] = useState(queues[0]?.queueId ?? 0);
  const [tierId, setTierId] = useState(0);
  const [entryType, setEntryType] = useState<'walkin' | 'appointment'>('walkin');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [result, setResult] = useState<CreateRegistrationResponseDto>();
  const [printReady, setPrintReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submissionInFlight = useRef(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const tiers = useQuery({
    queryKey: queryKeys.tiers.byQueue(queueId || undefined),
    queryFn: ({ signal }) =>
      getQueueTiers(
        queueId,
        { page: 1, pageSize: 100, sort: 'displayOrder:asc' },
        undefined,
        signal,
      ),
    enabled: queueId > 0,
  });
  const activeTiers = tiers.data?.data.items.filter((item) => item.isActive) ?? [];
  const site = useQuery({
    queryKey: queryKeys.sites.detail(siteId),
    queryFn: () => findSite(siteId),
  });
  const availability = useQuery({
    queryKey: queryKeys.availability(queueId, appointmentDate),
    queryFn: () => getAvailability(queueId, { dateFrom: appointmentDate, dateTo: appointmentDate }),
    enabled: entryType === 'appointment' && queueId > 0 && Boolean(appointmentDate),
  });
  const serviceTimeZone =
    availability.data?.data.timezone || site.data?.data.timezone || 'UTC';
  const availableSlots =
    availability.data?.data.days[0]?.slots?.filter(isSlotAvailable) ?? [];
  const submit = async () => {
    if (!choice || !queueId || !tierId || submissionInFlight.current) return;
    submissionInFlight.current = true;
    setPending(true);
    setSubmitError('');
    setResult(undefined);
    try {
      const dto: CreateRegistrationDto = {
        queueId,
        tierId,
        entryType,
        scheduledTime:
          entryType === 'appointment'
            ? appointmentUtcIso(appointmentDate, appointmentTime, serviceTimeZone)
            : undefined,
        ...(choice.kind === 'existing'
          ? { personId: choice.person.personId }
          : { person: choice.person }),
      };
      let response;
      try {
        response = await registerPerson(dto);
      } catch (error) {
        if (!(error instanceof NormalizedApiError) || error.status !== 409 || choice.kind !== 'new')
          throw error;
        const people = await findPersons({
          siteId,
          search: choice.person.phoneNumber,
          page: 1,
          pageSize: 100,
        });
        const phone = choice.person.phoneNumber.replaceAll(' ', '');
        const existing = people.data.items.find(
          (person) => person.phoneNumber?.replaceAll(' ', '') === phone,
        );
        if (!existing) throw error;
        response = await registerPerson({ ...dto, person: undefined, personId: existing.personId });
      }
      setResult(response.data);
      setPrintReady(false);
      setStep(3);
      await invalidateQueueOperations(queryClient);
      notify({
        tone: 'success',
        title:
          entryType === 'appointment'
            ? __t('notifications.appointment.created')
            : __t('notifications.visit.queued'),
        message: __t('notifications.visit.ticketMessage', { ticket: response.data.ticketNumber }),
      });
    } catch (error) {
      if (error instanceof NormalizedApiError && error.status === 409) {
        setSubmitError(__t('quickRegistration.activeConflict'));
      } else {
        notifyError(error);
      }
    } finally {
      submissionInFlight.current = false;
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
    setSubmitError('');
    setResult(undefined);
    setPrintReady(false);
  };
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) reset();
  };
  return (
    <>
      <Card className="quick-registration-launcher">
        <div>
          <p className="eyebrow">{__t('queue-operations.quickRegistration.accueil')}</p>
          <h2>{__t('queue-operations.quickRegistration.accueilRapide')}</h2>
          <p>{__t('quickRegistration.description')}</p>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          <Plus aria-hidden="true" />
          {__t('queue-operations.quickRegistration.creerUnTicket')}
        </button>
      </Card>
      <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title={__t('queue-operations.quickRegistration.accueilRapide')}
        description={
          step === 1
            ? __t('queue-operations.quickRegistration.stepPerson')
            : step === 2
              ? __t('queue-operations.quickRegistration.stepTicket')
              : __t('queue-operations.quickRegistration.stepComplete')
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
                {__t('queue-operations.quickRegistration.continuerVersLeTicket')}
                <ArrowRight aria-hidden="true" />
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
                  {__t('queue-operations.quickRegistration.modifierLaPersonne')}
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  disabled={!canSubmit}
                  onClick={() => void submit()}
                >
                  <TicketCheck aria-hidden="true" />
                  {pending
                    ? __t('common.creation')
                    : __t('queue-operations.quickRegistration.creerLeTicket')}
                </button>
              </>
            ) : null}
            {step === 3 ? (
              <>
                <button
                  className="button"
                  type="button"
                  disabled={!printReady}
                  onClick={() => {
                    document.body.dataset.printKioskTicket = 'true';
                    const cleanup = () => {
                      delete document.body.dataset.printKioskTicket;
                    };
                    window.addEventListener('afterprint', cleanup, { once: true });
                    window.print();
                    window.setTimeout(cleanup, 30_000);
                  }}
                >
                  <Printer aria-hidden="true" />
                  {__t('public-experiences.kiosk.imprimerMonTicket')}
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    handleOpenChange(false);
                  }}
                >
                  <Check aria-hidden="true" />
                  {__t('common.terminer')}
                </button>
              </>
            ) : null}
          </>
        }
      >
        <div className="quick-registration-form">
          <div
            className="wizard-progress"
            aria-label={__t('wizard.progress', { step: String(step), stepCount: '3' })}
          >
            {[1, 2, 3].map((item) => (
              <span key={item} className={item <= step ? 'is-complete' : undefined} />
            ))}
          </div>
          {step === 1 ? (
            <section
              className="quick-registration-step"
              aria-label={__t('queue-operations.quickRegistration.choixDeLaPersonne')}
            >
              <div className="wizard-step-heading">
                <span>1</span>
                <div>
                  <h3>{__t('queue-operations.quickRegistration.quiAccueillezVous')}</h3>
                  <p>{__t('quickRegistration.personStepHint')}</p>
                </div>
              </div>
              <PersonPickerOrCreate siteId={siteId} value={choice} onChange={setChoice} />
            </section>
          ) : null}
          {step === 2 ? (
            <section
              className="quick-registration-step"
              aria-label={__t('queue-operations.quickRegistration.qualificationDuTicket')}
            >
              <div className="appointment-person-recap">
                <div className="person-avatar" aria-hidden="true">
                  {personName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <small>{__t('common.personneSelectionnee')}</small>
                  <strong>{personName}</strong>
                  <span>{__t('quickRegistration.backHint')}</span>
                </div>
              </div>
              <div className="wizard-step-heading">
                <span>2</span>
                <div>
                  <h3>{__t('queue-operations.quickRegistration.commentPreparerSonPassage')}</h3>
                  <p>{__t('quickRegistration.ticketStepHint')}</p>
                </div>
              </div>
              <div className="form-grid">
                <FormField label={__t('queues.singular')} required>
                  <select
                    value={queueId}
                    onChange={(e) => {
                      setQueueId(Number(e.target.value));
                      setTierId(0);
                      setAppointmentTime('');
                    }}
                  >
                    <option value={0}>{__t('common.choose')}</option>
                    {queues.map((queue) => (
                      <option key={queue.queueId} value={queue.queueId}>
                        {queue.queueName}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label={__t('common.tier')} required>
                  <select
                    value={tierId}
                    onChange={(e) => {
                      setTierId(Number(e.target.value));
                    }}
                  >
                    <option value={0}>{__t('common.choose')}</option>
                    {activeTiers.map((tier) => (
                      <option key={tier.tierId} value={tier.tierId}>
                        {tier.tier?.tierName ??
                          __t('queue-operations.quickRegistration.serviceFallback', {
                            id: String(tier.tierId),
                          })}{' '}
                        ·{' '}
                        {new Intl.NumberFormat(i18n.language, {
                          style: 'currency',
                          currency: tier.currency,
                        }).format(tier.price)}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label={__t('common.type')}>
                  <select
                    value={entryType}
                    onChange={(e) => {
                      setEntryType(e.target.value as 'walkin' | 'appointment');
                      setAppointmentTime('');
                    }}
                  >
                    <option value="walkin">
                      {__t('queue-operations.quickRegistration.sansRendezVous')}
                    </option>
                    <option value="appointment">{__t('appointments.title')}</option>
                  </select>
                </FormField>
                {entryType === 'appointment' ? (
                  <FormField
                    label={__t('queue-operations.quickRegistration.dateDuRendezVous')}
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
                    label={__t('queue-operations.quickRegistration.heureDisponible')}
                    required
                    hint={
                      availability.isFetching
                        ? __t('appointments.availability.loading')
                        : availableSlots.length
                          ? __t('appointments.availability.loaded')
                          : __t('appointments.actions.noSlots')
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
                        {__t('queue-operations.quickRegistration.choisirUneHeure')}
                      </option>
                      {availableSlots.map((slot) => {
                        const value = slotTime(slot.time, serviceTimeZone);
                        return (
                          <option key={slot.time} value={value}>
                            {value} · {slot.available}{' '}
                            {__t('queue-operations.quickRegistration.placeS')}
                          </option>
                        );
                      })}
                    </select>
                  </FormField>
                ) : null}
              </div>
              {submitError ? (
                <p className="field-error quick-registration-submit-error" role="alert">
                  {submitError}
                </p>
              ) : null}
            </section>
          ) : null}
          {step === 3 && result ? (
            <section className="quick-registration-result" role="status">
              <div className="quick-registration-result-details">
                <span className="quick-registration-success" aria-hidden="true">
                  <Check />
                </span>
                <p className="eyebrow">{__t('common.registrationConfirmed')}</p>
                <h3>{personName}</h3>
                <strong>{result.ticketNumber}</strong>
                <p>
                  {queues.find((queue) => queue.queueId === queueId)?.queueName} ·{' '}
                  {entryType === 'appointment'
                    ? __t('queue-operations.quickRegistration.rendezVousReserve')
                    : __t('common.enAttente')}
                </p>
              </div>
              <div className="quick-registration-tracking">
                <TrackingQr value={trackingUrlFromToken(result.registrationTrackingToken)} />
                <p>{__t('quickRegistration.trackingQrHelp')}</p>
              </div>
              <KioskTicketPrintDocument
                ticketNumber={result.ticketNumber}
                siteName={site.data?.data.siteName}
                queueName={queues.find((queue) => queue.queueId === queueId)?.queueName}
                trackingUrl={trackingUrlFromToken(result.registrationTrackingToken)}
                onReady={() => {
                  setPrintReady(true);
                }}
              />
            </section>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
