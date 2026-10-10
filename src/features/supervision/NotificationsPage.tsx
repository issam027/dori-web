import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import type {
  NotificationResponseDto,
  PersonResponseDto,
  RegistrationResponseDto,
  SendManualNotificationDtoChannel,
} from '@/api/generated/models';
import { useSessionStore } from '@/core/auth/session-store';
import { hasPermission } from '@/core/permissions/permissions';
import { useScopeStore } from '@/core/scope/scope-store';
import { Card } from '@/design-system/components/Card';
import { DataTable } from '@/design-system/components/DataTable';
import { FilterDrawer } from '@/design-system/components/FilterDrawer';
import { Modal } from '@/design-system/components/Modal';
import { PageHeader } from '@/design-system/components/PageHeader';
import { Pagination } from '@/design-system/components/Pagination';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { canResendNotification, maskRecipient } from './notification-utils';
import { notify } from '@/core/notifications/notification-store';
import { usePersonsSearch } from '@/features/persons/hooks/usePersons';
import {
  useNotification,
  useNotifications,
  usePersonRegistrations,
  useResendNotification,
  useSendNotification,
} from './hooks/useNotifications';

const statusTone = (status: string): 'neutral' | 'success' | 'warning' | 'danger' =>
  status === 'delivered'
    ? 'success'
    : status === 'failed'
      ? 'danger'
      : status === 'pending' || status === 'processing'
        ? 'warning'
        : 'neutral';

function ManualNotificationWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t: __t } = useTranslation();
  const siteId = useScopeStore((s) => s.activeSiteId);
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');
  const [person, setPerson] = useState<PersonResponseDto>();
  const [registration, setRegistration] = useState<RegistrationResponseDto>();
  const [channel, setChannel] = useState<SendManualNotificationDtoChannel>('sms');
  const [content, setContent] = useState('');
  const persons = usePersonsSearch({
    siteId,
    search,
    page: 1,
    pageSize: 20,
    usage: 'notification',
    enabled: open,
  });
  const registrations = usePersonRegistrations(siteId, person?.personId);
  const send = useSendNotification(() => {
      notify({
        tone: 'success',
        title: __t('notifications.delivery.queued'),
        message: __t('notifications.delivery.queuedMessage'),
      });
      onOpenChange(false);
      setStep(1);
      setPerson(undefined);
      setRegistration(undefined);
      setContent('');
  });
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={__t('ui.supervision.notifications_page.nouvelle_notification_1mnw5o2')}
      description={`Étape ${String(step)} sur 3 · ${step === 1 ? 'Choisir la personne' : step === 2 ? 'Choisir le passage' : 'Rédiger et confirmer'}`}
      actions={
        <>
          {step > 1 ? (
            <button
              type="button"
              className="button"
              onClick={() => {
                setStep(step - 1);
              }}
            >
              {__t('ui.supervision.notifications_page.retour_18dwyy2')}
            </button>
          ) : null}
          {step === 1 ? (
            <button
              type="button"
              className="button button-primary"
              disabled={!person}
              onClick={() => {
                setStep(2);
              }}
            >
              {__t('ui.supervision.notifications_page.continuer_1dbvwde')}
            </button>
          ) : step === 2 ? (
            <button
              type="button"
              className="button button-primary"
              disabled={!registration}
              onClick={() => {
                setStep(3);
              }}
            >
              {__t('ui.supervision.notifications_page.rediger_le_message_11hqhqr')}
            </button>
          ) : (
            <button
              type="button"
              className="button button-primary"
              disabled={
                !content.trim() ||
                send.isPending ||
                (channel === 'sms' ? !person?.phoneNumber : !person?.email)
              }
              onClick={() => {
                if (registration)
                  send.run({ registrationId: registration.registrationId, channel, content });
              }}
            >
              {send.isPending
                ? __t('ui.expression.supervision.notifications_page.envoi_en_cours_wrdm0l')
                : __t(
                    'ui.expression.supervision.notifications_page.envoyer_la_notification_yb0lpd',
                  )}
            </button>
          )}
        </>
      }
    >
      {step === 1 ? (
        <div className="notification-wizard-step">
          <div
            className="wizard-track"
            aria-label={__t('ui.supervision.notifications_page.etape_1_sur_3_g6yr9g')}
          >
            <span className="done" />
            <span />
            <span />
          </div>
          <div className="notification-guidance">
            <span className="ticket-chip">1</span>
            <div>
              <h3>{__t('ui.supervision.notifications_page.a_qui_souhaitez_vous_ecrire_qsxij3')}</h3>
              <p>
                {__t(
                  'ui.supervision.notifications_page.recherchez_la_personne_concernee_par_son_nom_ou__tipor4',
                )}
              </p>
            </div>
          </div>
          <label>
            {__t('ui.supervision.notifications_page.rechercher_une_personne_ger18e')}
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              placeholder={__t('ui.supervision.notifications_page.nom_email_ou_telephone_10wtb1')}
            />
          </label>
          <div className="picker-list">
            {persons.data?.data.items.map((item) => (
              <button
                type="button"
                className={
                  person?.personId === item.personId ? 'picker-option selected' : 'picker-option'
                }
                key={item.personId}
                onClick={() => {
                  setPerson(item);
                  setRegistration(undefined);
                  setChannel(item.phoneNumber ? 'sms' : 'email');
                }}
              >
                <strong>
                  {item.firstName} {item.lastName}
                </strong>
                <span>{maskRecipient(item.phoneNumber ?? item.email)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : step === 2 ? (
        <div className="notification-wizard-step">
          <div
            className="wizard-track"
            aria-label={__t('ui.supervision.notifications_page.etape_2_sur_3_1eyht11')}
          >
            <span className="done" />
            <span className="done" />
            <span />
          </div>
          <div className="notification-guidance">
            <span className="ticket-chip">2</span>
            <div>
              <h3>{__t('ui.supervision.notifications_page.quel_passage_est_concerne_ythpcs')}</h3>
              <p>
                {__t(
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
            {registrations.data?.data.items.map((item) => (
              <button
                type="button"
                className={
                  registration?.registrationId === item.registrationId
                    ? 'picker-option selected'
                    : 'picker-option'
                }
                key={item.registrationId}
                onClick={() => {
                  setRegistration(item);
                }}
              >
                <strong>
                  {__t('ui.supervision.notifications_page.ticket_1nrpxxh')}
                  {item.ticketNumber}
                </strong>
                <span>
                  {item.businessDate} · {item.status}
                </span>
              </button>
            ))}
          </div>
          {registrations.isSuccess && registrations.data.data.items.length === 0 ? (
            <p className="field-hint">
              {__t(
                'ui.supervision.notifications_page.aucun_passage_recent_n_est_disponible_pour_cette_1xprp0p',
              )}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="notification-wizard-step">
          <div
            className="wizard-track"
            aria-label={__t('ui.supervision.notifications_page.etape_3_sur_3_51ykkm')}
          >
            <span className="done" />
            <span className="done" />
            <span className="done" />
          </div>
          <div className="notification-guidance">
            <span className="ticket-chip">3</span>
            <div>
              <h3>{__t('ui.supervision.notifications_page.redigez_votre_message_1a07wcw')}</h3>
              <p>
                {__t(
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
              {__t('ui.supervision.notifications_page.inscription_1bzavbp')}
              {registration?.ticketNumber} · #{registration?.registrationId}
            </p>
          </Card>
          <label className="form-field">
            {__t('ui.supervision.notifications_page.canal_1219p1c')}
            <select
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value as SendManualNotificationDtoChannel);
              }}
            >
              <option value="sms" disabled={!person?.phoneNumber}>
                {__t('ui.supervision.notifications_page.sms_q3rkiy')}
                {!person?.phoneNumber
                  ? __t('ui.expression.supervision.notifications_page.indisponible_527qxz')
                  : ''}
              </option>
              <option value="email" disabled={!person?.email}>
                {__t('ui.supervision.notifications_page.email_inbfc7')}
                {!person?.email
                  ? __t('ui.expression.supervision.notifications_page.indisponible_527qxz')
                  : ''}
              </option>
            </select>
          </label>
          <p className="notification-recipient">
            {__t('ui.supervision.notifications_page.destinataire_1m2olzi')}{' '}
            <strong>
              {maskRecipient(channel === 'sms' ? person?.phoneNumber : person?.email)}
            </strong>
          </p>
          <label className="form-field">
            {__t('ui.supervision.notifications_page.message_1cam7ic')}
            <textarea
              rows={5}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
              }}
              placeholder={__t(
                'ui.supervision.notifications_page.saisissez_un_message_clair_et_concis_1f79kui',
              )}
              maxLength={480}
            />
            <small className="field-hint">
              {content.length} {__t('ui.supervision.notifications_page.480_caracteres_198qcea')}
            </small>
          </label>
          <div className="notification-preview">
            <span>
              {channel === 'sms'
                ? __t('ui.expression.supervision.notifications_page.apercu_sms_1baojkm')
                : __t('ui.expression.supervision.notifications_page.apercu_email_117cipf')}
            </span>
            <p>
              {content ||
                __t(
                  'ui.expression.supervision.notifications_page.votre_message_apparaitra_ici_kkqap3',
                )}
            </p>
          </div>
          {send.isError ? (
            <p role="alert" className="error-text">
              {__t('ui.supervision.notifications_page.l_envoi_n_a_pas_pu_etre_mis_en_file_k30dtn')}
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}

export function NotificationsPage() {
  const { t: __t } = useTranslation();
  const user = useSessionStore((s) => s.user);
  const canSend = hasPermission(user, 'notification_send');
  const [page, setPage] = useState(1);
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [wizard, setWizard] = useState(false);
  const [detailId, setDetailId] = useState<number>();
  const journal = useNotifications({
    page,
    channel: channel || undefined,
    status: status || undefined,
    date: date || undefined,
  });
  const detail = useNotification(detailId);
  const resend = useResendNotification(() => {
      notify({
        tone: 'success',
        title: __t('notifications.delivery.requeued'),
        message: __t('notifications.delivery.requeuedMessage'),
      });
  });
  const items = journal.data?.data.items ?? [];
  const activeFilters = Number(Boolean(channel)) + Number(Boolean(status)) + Number(Boolean(date));
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Communication"
        title={__t('ui.supervision.notifications_page.notifications_fki4un')}
        description={__t(
          'ui.supervision.notifications_page.journal_d_envoi_detail_et_emission_manuelle_pbxvuy',
        )}
        actions={
          <div className="action-row">
            <FilterDrawer activeCount={activeFilters}>
              <div className="form-stack">
                <label>
                  {__t('ui.supervision.notifications_page.canal_1219p1c')}
                  <select
                    value={channel}
                    onChange={(e) => {
                      setChannel(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">
                      {__t('ui.supervision.notifications_page.tous_1eotn8w')}
                    </option>
                    <option value="sms">
                      {__t('ui.supervision.notifications_page.sms_q3rkiy')}
                    </option>
                    <option value="email">
                      {__t('ui.supervision.notifications_page.email_inbfc7')}
                    </option>
                  </select>
                </label>
                <label>
                  {__t('ui.supervision.notifications_page.statut_1yaum3a')}
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">
                      {__t('ui.supervision.notifications_page.tous_1eotn8w')}
                    </option>
                    {['pending', 'processing', 'sent', 'delivered', 'failed'].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {__t('ui.supervision.notifications_page.date_ggjuyh')}
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
              </div>
            </FilterDrawer>
            {canSend ? (
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  setWizard(true);
                }}
              >
                {__t('ui.supervision.notifications_page.nouvel_envoi_1kutyxn')}
              </button>
            ) : null}
          </div>
        }
      />
      <Card>
        <DataTable
          caption={__t('ui.supervision.notifications_page.journal_des_notifications_1gdlx9g')}
          rows={items}
          getRowKey={(row) => row.notificationId}
          columns={[
            {
              key: 'created',
              header: 'Créée',
              render: (row) => new Date(row.createdAt).toLocaleString(),
            },
            {
              key: 'ticket',
              header: 'Inscription',
              render: (row) => row.ticketNumber ?? `#${String(row.registrationId)}`,
            },
            { key: 'channel', header: 'Canal', render: (row) => row.channel.toUpperCase() },
            {
              key: 'recipient',
              header: 'Destinataire',
              render: (row) => maskRecipient(row.recipient),
            },
            {
              key: 'status',
              header: 'Statut',
              render: (row) => (
                <StatusBadge tone={statusTone(row.notificationStatus)}>
                  {row.notificationStatus}
                </StatusBadge>
              ),
            },
            {
              key: 'attempts',
              header: 'Tentatives',
              align: 'end',
              render: (row) => row.attemptCount,
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => (
                <div className="action-row">
                  <button
                    type="button"
                    className="button button-small"
                    onClick={() => {
                      setDetailId(row.notificationId);
                    }}
                  >
                    {__t('ui.supervision.notifications_page.detail_qlpl2o')}
                  </button>
                  {canResendNotification(row.notificationStatus, canSend) ? (
                    <button
                      type="button"
                      className="button button-small"
                      disabled={resend.isPending}
                      onClick={() => {
                        resend.run(row.notificationId);
                      }}
                    >
                      {__t('ui.supervision.notifications_page.reemettre_1d0q7c4')}
                    </button>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
        <Pagination
          page={journal.data?.data.page ?? page}
          totalPages={Math.max(1, journal.data?.data.totalPages ?? 1)}
          onPageChange={setPage}
        />
      </Card>
      <ManualNotificationWizard open={wizard} onOpenChange={setWizard} />
      <Modal
        open={Boolean(detailId)}
        onOpenChange={(open) => {
          if (!open) setDetailId(undefined);
        }}
        title={__t('ui.supervision.notifications_page.detail_de_la_notification_xau4jx')}
      >
        <NotificationDetail notification={detail.data?.data} />
      </Modal>
    </div>
  );
}

function NotificationDetail({ notification }: { notification?: NotificationResponseDto }) {
  const { t: __t } = useTranslation();
  if (!notification) return <p>{__t('ui.supervision.notifications_page.chargement_16kwy5p')}</p>;
  return (
    <dl className="detail-list">
      <dt>{__t('ui.supervision.notifications_page.inscription_1bzavbp')}</dt>
      <dd>#{notification.registrationId}</dd>
      <dt>{__t('ui.supervision.notifications_page.destinataire_1qtg5cw')}</dt>
      <dd>{maskRecipient(notification.recipient)}</dd>
      <dt>{__t('ui.supervision.notifications_page.canal_1219p1c')}</dt>
      <dd>{notification.channel}</dd>
      <dt>{__t('ui.supervision.notifications_page.statut_1yaum3a')}</dt>
      <dd>{notification.notificationStatus}</dd>
      <dt>{__t('ui.supervision.notifications_page.contenu_1hxusj9')}</dt>
      <dd>{notification.notificationContent}</dd>
      <dt>{__t('ui.supervision.notifications_page.echec_14peoen')}</dt>
      <dd>{notification.failureReason ?? '—'}</dd>
    </dl>
  );
}
