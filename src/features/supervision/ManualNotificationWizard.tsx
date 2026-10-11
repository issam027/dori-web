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
      title={t('ui.supervision.notifications_page.nouvelle_notification_1mnw5o2')}
      description={t('wizard.progress', { step: stepNumber[step], stepCount: 3 })}
      actions={
        <>
          {step !== 'audience' ? (
            <button
              type="button"
              className="button"
              onClick={() => {
                setStep(transitionNotificationWizard(step, 'back'));
              }}
            >
              <ArrowLeft aria-hidden="true" />
              {t('common.previous')}
            </button>
          ) : null}
          {step !== 'content' ? (
            <button
              type="button"
              className="button button-primary"
              disabled={nextDisabled}
              onClick={() => {
                setStep(transitionNotificationWizard(step, 'next'));
              }}
            >
              {t('common.next')}
              <ArrowRight aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              className="button button-primary"
              disabled={!canSend}
              onClick={() => {
                if (registration)
                  send.run({ registrationId: registration.registrationId, channel, content });
              }}
            >
              <Send aria-hidden="true" />
              {send.isPending
                ? t('ui.expression.supervision.notifications_page.envoi_en_cours_wrdm0l')
                : t('ui.expression.supervision.notifications_page.envoyer_la_notification_yb0lpd')}
            </button>
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
          <h3>{t('ui.supervision.notifications_page.a_qui_souhaitez_vous_ecrire_qsxij3')}</h3>
          <p>
            {t(
              'ui.supervision.notifications_page.recherchez_la_personne_concernee_par_son_nom_ou__tipor4',
            )}
          </p>
        </div>
      </div>
      <label>
        {t('ui.supervision.notifications_page.rechercher_une_personne_ger18e')}
        <input
          value={search}
          onChange={(event) => {
            onSearch(event.target.value);
          }}
          placeholder={t('ui.supervision.notifications_page.nom_email_ou_telephone_10wtb1')}
        />
      </label>
      <div className="picker-list">
        {persons.map((item) => (
          <button
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
          </button>
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
          <h3>{t('ui.supervision.notifications_page.quel_passage_est_concerne_ythpcs')}</h3>
          <p>
            {t(
              'ui.supervision.notifications_page.choisissez_le_ticket_auquel_la_notification_sera_ck6t53',
            )}
          </p>
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
          <button
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
              {t('ui.supervision.notifications_page.ticket_1nrpxxh')}
              {item.ticketNumber}
            </strong>
            <span>
              {item.businessDate} · {item.status}
            </span>
          </button>
        ))}
      </div>
      {loaded && registrations.length === 0 ? (
        <p className="field-hint">
          {t(
            'ui.supervision.notifications_page.aucun_passage_recent_n_est_disponible_pour_cette_1xprp0p',
          )}
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
          <h3>{t('ui.supervision.notifications_page.redigez_votre_message_1a07wcw')}</h3>
          <p>
            {t(
              'ui.supervision.notifications_page.verifiez_le_canal_et_le_destinataire_avant_l_env_jfp76y',
            )}
          </p>
        </div>
      </div>
      <Card className="notification-person-recap">
        <strong>
          {person?.firstName} {person?.lastName}
        </strong>
        <p>
          {t('ui.supervision.notifications_page.inscription_1bzavbp')}
          {registration?.ticketNumber} · #{registration?.registrationId}
        </p>
      </Card>
      <label className="form-field">
        {t('ui.supervision.notifications_page.canal_1219p1c')}
        <select
          value={channel}
          onChange={(event) => {
            onChannel(event.target.value as SendManualNotificationDtoChannel);
          }}
        >
          <option value="sms" disabled={!person?.phoneNumber}>
            {t('ui.supervision.notifications_page.sms_q3rkiy')}
          </option>
          <option value="email" disabled={!person?.email}>
            {t('ui.supervision.notifications_page.email_inbfc7')}
          </option>
        </select>
      </label>
      <p className="notification-recipient">
        {t('ui.supervision.notifications_page.destinataire_1m2olzi')}{' '}
        <strong>{maskRecipient(notificationRecipient(person, channel))}</strong>
      </p>
      <label className="form-field">
        {t('ui.supervision.notifications_page.message_1cam7ic')}
        <textarea
          rows={5}
          value={content}
          onChange={(event) => {
            onContent(event.target.value);
          }}
          placeholder={t(
            'ui.supervision.notifications_page.saisissez_un_message_clair_et_concis_1f79kui',
          )}
          maxLength={480}
        />
        <small className="field-hint">
          {content.length} {t('ui.supervision.notifications_page.480_caracteres_198qcea')}
        </small>
      </label>
      <div className="notification-preview">
        <span>
          {channel === 'sms'
            ? t('ui.expression.supervision.notifications_page.apercu_sms_1baojkm')
            : t('ui.expression.supervision.notifications_page.apercu_email_117cipf')}
        </span>
        <p>
          {content ||
            t('ui.expression.supervision.notifications_page.votre_message_apparaitra_ici_kkqap3')}
        </p>
      </div>
      {error ? (
        <p role="alert" className="error-text">
          {t('ui.supervision.notifications_page.l_envoi_n_a_pas_pu_etre_mis_en_file_k30dtn')}
        </p>
      ) : null}
    </section>
  );
}
