import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import type {
  PersonResponseDto,
  RegistrationResponseDto,
  SendManualNotificationDtoChannel,
} from '@/api/generated/models';
import { useScopeStore } from '@/core/scope/scope-store';
import { notify } from '@/core/notifications/notification-store';
import { Card } from '@/design-system/components/Card';
import { Modal } from '@/design-system/components/Modal';
import { Pagination } from '@/design-system/components/Pagination';
import { usePersonsSearch } from '@/features/persons/hooks/usePersons';
import { maskRecipient } from './notification-utils';
import { usePersonRegistrations, useSendNotification } from './hooks/useNotifications';
import {
  canSendManualNotification,
  notificationRecipient,
  transitionNotificationWizard,
  type NotificationWizardStep,
} from './notification-wizard-machine';
import { Button } from '@/design-system/components/Button';

const stepNumber: Record<NotificationWizardStep, number> = {
  audience: 1,
  registration: 2,
  content: 3,
};

export function ManualNotificationWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const siteId = useScopeStore((state) => state.activeSiteId);
  const [step, setStep] = useState<NotificationWizardStep>('audience');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [person, setPerson] = useState<PersonResponseDto>();
  const [registration, setRegistration] = useState<RegistrationResponseDto>();
  const [channel, setChannel] = useState<SendManualNotificationDtoChannel>('sms');
  const [content, setContent] = useState('');
  const persons = usePersonsSearch({
    siteId,
    search,
    page,
    pageSize: 5,
    usage: 'notification',
    enabled: open,
  });
  const registrations = usePersonRegistrations(siteId, person?.personId);

  const reset = () => {
    setStep('audience');
    setSearch('');
    setPage(1);
    setPerson(undefined);
    setRegistration(undefined);
    setChannel('sms');
    setContent('');
  };
  const close = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) reset();
  };
  const send = useSendNotification(() => {
    notify({
      tone: 'success',
      title: t('notifications.delivery.queued'),
      message: t('notifications.delivery.queuedMessage'),
    });
    close(false);
  });
  const nextDisabled =
    (step === 'audience' && !person) || (step === 'registration' && !registration);
  const canSend = canSendManualNotification({
    hasRegistration: Boolean(registration),
    content,
    person,
    channel,
    pending: send.isPending,
  });

  return (
    <Modal
      open={open}
      onOpenChange={close}
      title={t('supervision.notifications.nouvelleNotification')}
      description={t('wizard.progress', { step: stepNumber[step], stepCount: 3 })}
      className="notification-wizard-dialog"
      actions={
        <>
          {step !== 'audience' ? (
            <Button
              variant="unstyled"
              type="button"
              className="button"
              onClick={() => {
                setStep(transitionNotificationWizard(step, 'back'));
              }}
            >
              <ArrowLeft aria-hidden="true" />
              <span className="button-label">{t('common.previous')}</span>
            </Button>
          ) : null}
          {step !== 'content' ? (
            <Button
              variant="unstyled"
              type="button"
              className="button button-primary"
              disabled={nextDisabled}
              onClick={() => {
                setStep(transitionNotificationWizard(step, 'next'));
              }}
            >
              <span className="button-label">{t('common.next')}</span>
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : (
            <Button
              variant="unstyled"
              type="button"
              className="button button-primary"
              disabled={!canSend}
              onClick={() => {
                if (registration)
                  send.run({ registrationId: registration.registrationId, channel, content });
              }}
            >
              <Send aria-hidden="true" />
              <span className="button-label">
                {send.isPending
                  ? t('supervision.notifications.envoiEnCours')
                  : t('supervision.notifications.envoyerLaNotification')}
              </span>
            </Button>
          )}
        </>
      }
    >
      <div
        className="wizard-track"
        aria-label={t('wizard.progress', { step: stepNumber[step], stepCount: 3 })}
      >
        {[1, 2, 3].map((position) => (
          <span className={position <= stepNumber[step] ? 'done' : undefined} key={position} />
        ))}
      </div>
      {step === 'audience' ? (
        <NotificationAudienceStep
          search={search}
          page={page}
          person={person}
          persons={persons.data?.data.items ?? []}
          totalPages={persons.data?.data.totalPages ?? 1}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          onPage={setPage}
          onSelect={(value) => {
            setPerson(value);
            setRegistration(undefined);
            setChannel(value.phoneNumber ? 'sms' : 'email');
          }}
        />
      ) : step === 'registration' ? (
        <NotificationRegistrationStep
          person={person}
          registration={registration}
          registrations={registrations.data?.data.items ?? []}
          loaded={registrations.isSuccess}
          onSelect={setRegistration}
        />
      ) : (
        <NotificationContentStep
          person={person}
          registration={registration}
          channel={channel}
          content={content}
          error={send.isError}
          onChannel={setChannel}
          onContent={setContent}
        />
      )}
    </Modal>
  );
}

function NotificationAudienceStep({
  search,
  page,
  person,
  persons,
  totalPages,
  onSearch,
  onPage,
  onSelect,
}: {
  search: string;
  page: number;
  person?: PersonResponseDto;
  persons: readonly PersonResponseDto[];
  totalPages: number;
  onSearch: (value: string) => void;
  onPage: (page: number) => void;
  onSelect: (person: PersonResponseDto) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="notification-wizard-step">
      <div className="notification-guidance">
        <span className="ticket-chip">1</span>
        <div>
          <h3>{t('supervision.notifications.aQuiSouhaitezVousEcrire')}</h3>
          <p>{t('supervision.notifications.recherchezLaPersonneConcerneeParSonNomOu')}</p>
        </div>
      </div>
      <label className="form-field">
        <span>{t('common.rechercherUnePersonne')}</span>
        <input
          value={search}
          onChange={(event) => {
            onSearch(event.target.value);
          }}
          placeholder={t('supervision.notifications.nomEmailOuTelephone')}
        />
      </label>
      <div className="picker-list">
        {persons.map((item) => (
          <Button
            variant="unstyled"
            type="button"
            className={
              person?.personId === item.personId ? 'picker-option selected' : 'picker-option'
            }
            key={item.personId}
            onClick={() => {
              onSelect(item);
            }}
          >
            <strong>
              {item.firstName} {item.lastName}
            </strong>
            <span>{maskRecipient(item.phoneNumber ?? item.email)}</span>
          </Button>
        ))}
      </div>
      {totalPages > 1 ? (
        <Pagination page={page} totalPages={totalPages} onPageChange={onPage} />
      ) : null}
    </section>
  );
}

function NotificationRegistrationStep({
  person,
  registration,
  registrations,
  loaded,
  onSelect,
}: {
  person?: PersonResponseDto;
  registration?: RegistrationResponseDto;
  registrations: readonly RegistrationResponseDto[];
  loaded: boolean;
  onSelect: (registration: RegistrationResponseDto) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="notification-wizard-step">
      <div className="notification-guidance">
        <span className="ticket-chip">2</span>
        <div>
          <h3>{t('supervision.notifications.quelPassageEstConcerne')}</h3>
          <p>{t('supervision.notifications.choisissezLeTicketAuquelLaNotificationSera')}</p>
        </div>
      </div>
      <Card className="notification-person-recap">
        <strong>
          {person?.firstName} {person?.lastName}
        </strong>
        <span>{maskRecipient(person?.phoneNumber ?? person?.email)}</span>
      </Card>
      <div className="picker-list">
        {registrations.map((item) => (
          <Button
            variant="unstyled"
            type="button"
            className={
              registration?.registrationId === item.registrationId
                ? 'picker-option selected'
                : 'picker-option'
            }
            key={item.registrationId}
            onClick={() => {
              onSelect(item);
            }}
          >
            <strong>
              {t('common.ticket')}
              {item.ticketNumber}
            </strong>
            <span>
              {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                new Date(item.businessDate),
              )}{' '}
              · {t(`common.${item.status}`, { defaultValue: item.status })}
            </span>
          </Button>
        ))}
      </div>
      {loaded && registrations.length === 0 ? (
        <p className="field-hint">
          {t('supervision.notifications.aucunPassageRecentNEstDisponiblePourCette')}
        </p>
      ) : null}
    </section>
  );
}

function NotificationContentStep({
  person,
  registration,
  channel,
  content,
  error,
  onChannel,
  onContent,
}: {
  person?: PersonResponseDto;
  registration?: RegistrationResponseDto;
  channel: SendManualNotificationDtoChannel;
  content: string;
  error: boolean;
  onChannel: (channel: SendManualNotificationDtoChannel) => void;
  onContent: (content: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="notification-wizard-step">
      <div className="notification-guidance">
        <span className="ticket-chip">3</span>
        <div>
          <h3>{t('supervision.notifications.redigezVotreMessage')}</h3>
          <p>{t('supervision.notifications.verifiezLeCanalEtLeDestinataireAvantLEnv')}</p>
        </div>
      </div>
      <Card className="notification-person-recap">
        <strong>
          {person?.firstName} {person?.lastName}
        </strong>
        <p>
          {t('supervision.notifications.inscription')}
          {registration?.ticketNumber} · #{registration?.registrationId}
        </p>
      </Card>
      <label className="form-field">
        {t('common.canal')}
        <select
          value={channel}
          onChange={(event) => {
            onChannel(event.target.value as SendManualNotificationDtoChannel);
          }}
        >
          <option value="sms" disabled={!person?.phoneNumber}>
            {t('common.sms')}
          </option>
          <option value="email" disabled={!person?.email}>
            {t('common.email')}
          </option>
        </select>
      </label>
      <p className="notification-recipient">
        {t('supervision.notifications.destinataire')}{' '}
        <strong>{maskRecipient(notificationRecipient(person, channel))}</strong>
      </p>
      <label className="form-field">
        {t('common.message')}
        <textarea
          rows={5}
          value={content}
          onChange={(event) => {
            onContent(event.target.value);
          }}
          placeholder={t('supervision.notifications.saisissezUnMessageClairEtConcis')}
          maxLength={480}
        />
        <small className="field-hint">
          {content.length} {t('notifications.characterLimit')}
        </small>
      </label>
      <div className="notification-preview">
        <span>
          {channel === 'sms'
            ? t('supervision.notifications.apercuSms')
            : t('supervision.notifications.apercuEmail')}
        </span>
        <p>{content || t('supervision.notifications.votreMessageApparaitraIci')}</p>
      </div>
      {error ? (
        <p role="alert" className="error-text">
          {t('supervision.notifications.lEnvoiNAPasPuEtreMisEnFile')}
        </p>
      ) : null}
    </section>
  );
}
