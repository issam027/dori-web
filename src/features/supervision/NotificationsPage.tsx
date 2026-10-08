import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  NotificationResponseDto,
  PersonResponseDto,
  RegistrationResponseDto,
  SendManualNotificationDtoChannel,
} from '@/api/generated/models';
import {
  notificationsControllerFindNotificationById,
  notificationsControllerFindNotifications,
  notificationsControllerResend,
  notificationsControllerSendManual,
} from '@/api/generated/notifications/notifications';
import { personsControllerFindPersons } from '@/api/generated/persons/persons';
import { registrationsControllerFindRegistrations } from '@/api/generated/registrations/registrations';
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
  const client = useQueryClient();
  const siteId = useScopeStore((s) => s.activeSiteId);
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');
  const [person, setPerson] = useState<PersonResponseDto>();
  const [registration, setRegistration] = useState<RegistrationResponseDto>();
  const [channel, setChannel] = useState<SendManualNotificationDtoChannel>('sms');
  const [content, setContent] = useState('');
  const persons = useQuery({
    queryKey: ['persons', 'notification', siteId, search],
    enabled: open && Boolean(siteId),
    queryFn: () => {
      if (siteId === null) throw new Error('Un site actif est requis');
      return personsControllerFindPersons({
        siteId,
        search: search || undefined,
        page: 1,
        pageSize: 20,
      });
    },
  });
  const registrations = useQuery({
    queryKey: ['registrations', 'notification', person?.personId],
    enabled: Boolean(person),
    queryFn: () => {
      if (!person) throw new Error('Une personne est requise');
      return registrationsControllerFindRegistrations({
        personId: person.personId,
        siteId: siteId ?? undefined,
        page: 1,
        pageSize: 20,
        sort: 'createdAt:desc',
      });
    },
  });
  const send = useMutation({
    mutationFn: () => {
      if (!registration) throw new Error('Une inscription est requise');
      return notificationsControllerSendManual({
        registrationId: registration.registrationId,
        channel,
        content,
      });
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['notifications'] });
      onOpenChange(false);
      setStep(1);
      setPerson(undefined);
      setRegistration(undefined);
      setContent('');
    },
  });
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Nouvelle notification"
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
              ← Retour
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
              Continuer
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
              Rédiger le message →
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
                send.mutate();
              }}
            >
              {send.isPending ? 'Envoi en cours…' : 'Envoyer la notification'}
            </button>
          )}
        </>
      }
    >
      {step === 1 ? (
        <div className="notification-wizard-step">
          <div className="wizard-track" aria-label="Étape 1 sur 3">
            <span className="done" />
            <span />
            <span />
          </div>
          <div className="notification-guidance">
            <span className="ticket-chip">1</span>
            <div>
              <h3>À qui souhaitez-vous écrire ?</h3>
              <p>Recherchez la personne concernée par son nom ou ses coordonnées.</p>
            </div>
          </div>
          <label>
            Rechercher une personne
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              placeholder="Nom, email ou téléphone"
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
          <div className="wizard-track" aria-label="Étape 2 sur 3">
            <span className="done" />
            <span className="done" />
            <span />
          </div>
          <div className="notification-guidance">
            <span className="ticket-chip">2</span>
            <div>
              <h3>Quel passage est concerné ?</h3>
              <p>Choisissez le ticket auquel la notification sera rattachée.</p>
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
                <strong>Ticket {item.ticketNumber}</strong>
                <span>
                  {item.businessDate} · {item.status}
                </span>
              </button>
            ))}
          </div>
          {registrations.isSuccess && registrations.data.data.items.length === 0 ? (
            <p className="field-hint">Aucun passage récent n’est disponible pour cette personne.</p>
          ) : null}
        </div>
      ) : (
        <div className="notification-wizard-step">
          <div className="wizard-track" aria-label="Étape 3 sur 3">
            <span className="done" />
            <span className="done" />
            <span className="done" />
          </div>
          <div className="notification-guidance">
            <span className="ticket-chip">3</span>
            <div>
              <h3>Rédigez votre message</h3>
              <p>Vérifiez le canal et le destinataire avant l’envoi.</p>
            </div>
          </div>
          <Card className="notification-person-recap">
            <strong>
              {person?.firstName} {person?.lastName}
            </strong>
            <p>
              Inscription {registration?.ticketNumber} · #{registration?.registrationId}
            </p>
          </Card>
          <label className="form-field">
            Canal
            <select
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value as SendManualNotificationDtoChannel);
              }}
            >
              <option value="sms" disabled={!person?.phoneNumber}>
                SMS {!person?.phoneNumber ? '— indisponible' : ''}
              </option>
              <option value="email" disabled={!person?.email}>
                Email {!person?.email ? '— indisponible' : ''}
              </option>
            </select>
          </label>
          <p className="notification-recipient">
            Destinataire :{' '}
            <strong>
              {maskRecipient(channel === 'sms' ? person?.phoneNumber : person?.email)}
            </strong>
          </p>
          <label className="form-field">
            Message
            <textarea
              rows={5}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
              }}
              placeholder="Saisissez un message clair et concis…"
              maxLength={480}
            />
            <small className="field-hint">{content.length} / 480 caractères</small>
          </label>
          <div className="notification-preview">
            <span>{channel === 'sms' ? 'Aperçu SMS' : 'Aperçu email'}</span>
            <p>{content || 'Votre message apparaîtra ici.'}</p>
          </div>
          {send.isError ? (
            <p role="alert" className="error-text">
              L’envoi n’a pas pu être mis en file.
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}

export function NotificationsPage() {
  const client = useQueryClient();
  const user = useSessionStore((s) => s.user);
  const canSend = hasPermission(user, 'notification_send');
  const [page, setPage] = useState(1);
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [wizard, setWizard] = useState(false);
  const [detailId, setDetailId] = useState<number>();
  const journal = useQuery({
    queryKey: ['notifications', page, channel, status, date],
    queryFn: () =>
      notificationsControllerFindNotifications({
        page,
        pageSize: 25,
        sort: 'createdAt:desc',
        channel: channel ? (channel as 'sms' | 'email') : undefined,
        status: status
          ? (status as 'pending' | 'processing' | 'sent' | 'delivered' | 'failed')
          : undefined,
        businessDate: date || undefined,
      }),
  });
  const detail = useQuery({
    queryKey: ['notifications', 'detail', detailId],
    enabled: Boolean(detailId),
    queryFn: () => {
      if (detailId === undefined) throw new Error('Une notification est requise');
      return notificationsControllerFindNotificationById(detailId);
    },
  });
  const resend = useMutation({
    mutationFn: (id: number) => notificationsControllerResend(id),
    onSuccess: async () => client.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const items = journal.data?.data.items ?? [];
  const activeFilters = Number(Boolean(channel)) + Number(Boolean(status)) + Number(Boolean(date));
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Communication"
        title="Notifications"
        description="Journal d’envoi, détail et émission manuelle."
        actions={
          <div className="action-row">
            <FilterDrawer activeCount={activeFilters}>
              <div className="form-stack">
                <label>
                  Canal
                  <select
                    value={channel}
                    onChange={(e) => {
                      setChannel(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Tous</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </label>
                <label>
                  Statut
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Tous</option>
                    {['pending', 'processing', 'sent', 'delivered', 'failed'].map((s) => (
                      <option key={s}>{s}</option>
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
                Nouvel envoi
              </button>
            ) : null}
          </div>
        }
      />
      <Card>
        <DataTable
          caption="Journal des notifications"
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
                    Détail
                  </button>
                  {canResendNotification(row.notificationStatus, canSend) ? (
                    <button
                      type="button"
                      className="button button-small"
                      disabled={resend.isPending}
                      onClick={() => {
                        resend.mutate(row.notificationId);
                      }}
                    >
                      Réémettre
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
        title="Détail de la notification"
      >
        <NotificationDetail notification={detail.data?.data} />
      </Modal>
    </div>
  );
}

function NotificationDetail({ notification }: { notification?: NotificationResponseDto }) {
  if (!notification) return <p>Chargement…</p>;
  return (
    <dl className="detail-list">
      <dt>Inscription</dt>
      <dd>#{notification.registrationId}</dd>
      <dt>Destinataire</dt>
      <dd>{maskRecipient(notification.recipient)}</dd>
      <dt>Canal</dt>
      <dd>{notification.channel}</dd>
      <dt>Statut</dt>
      <dd>{notification.notificationStatus}</dd>
      <dt>Contenu</dt>
      <dd>{notification.notificationContent}</dd>
      <dt>Échec</dt>
      <dd>{notification.failureReason ?? '—'}</dd>
    </dl>
  );
}
