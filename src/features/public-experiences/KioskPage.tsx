import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type {
  CreateRegistrationResponseDto,
  QueueTierResponseDto,
  RegistrationResponseDto,
} from '@/api/generated/models';
import { queuesControllerFindAll } from '@/api/generated/queues/queues';
import {
  registrationsControllerCheckIn,
  registrationsControllerLookup,
  registrationsControllerRegister,
} from '@/api/generated/registrations/registrations';
import { serviceTiersControllerGetQueueTiers } from '@/api/generated/tiers/tiers';
import { useSessionStore } from '@/core/auth/session-store';
import { useScopeStore } from '@/core/scope/scope-store';
import { Card } from '@/design-system/components/Card';
import { TrackingQr } from './TrackingQr';
import { kioskIdleMs, useKioskWatchdog } from './useKioskWatchdog';

type Flow = 'home' | 'walkin' | 'appointment' | 'result';
type Result = Pick<CreateRegistrationResponseDto, 'ticketNumber' | 'trackingUrl'> & {
  queueName?: string;
};

export function KioskPage() {
  const user = useSessionStore((state) => state.user);
  const activeSiteId = useScopeStore((state) => state.activeSiteId);
  const [flow, setFlow] = useState<Flow>('home');
  const [queueId, setQueueId] = useState<number>();
  const [tier, setTier] = useState<QueueTierResponseDto>();
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [ticket, setTicket] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [found, setFound] = useState<RegistrationResponseDto>();
  const [result, setResult] = useState<Result>();
  const purge = useCallback(() => {
    setFlow('home');
    setQueueId(undefined);
    setTier(undefined);
    setLastName('');
    setPhone('');
    setTicket('');
    setScheduledTime('');
    setFound(undefined);
    setResult(undefined);
  }, []);
  const watchdog = useKioskWatchdog(purge, kioskIdleMs(import.meta.env.VITE_KIOSK_IDLE_MS));
  const scopeSites = user?.scope.siteIds ?? [];
  const validScope =
    Boolean(activeSiteId) &&
    Boolean(
      user &&
      (user.userType !== 'kiosk' ||
        (!user.scope.isGlobal && scopeSites.length === 1 && activeSiteId === scopeSites[0])),
    );
  const queues = useQuery({
    queryKey: ['kiosk', 'queues', activeSiteId],
    enabled: validScope,
    queryFn: () =>
      queuesControllerFindAll({
        siteId: activeSiteId ?? undefined,
        isActive: true,
        page: 1,
        pageSize: 100,
      }),
  });
  const tiers = useQuery({
    queryKey: ['kiosk', 'tiers', queueId],
    enabled: Boolean(queueId),
    queryFn: () =>
      serviceTiersControllerGetQueueTiers(queueId ?? 0, {
        page: 1,
        pageSize: 100,
        sort: 'displayOrder:asc',
      }),
  });
  const register = useMutation({
    mutationFn: () => {
      if (!queueId || !tier) throw new Error('File et forfait requis');
      return registrationsControllerRegister({
        queueId,
        tierId: tier.tierId,
        entryType: 'walkin',
        languagePreference: document.documentElement.lang || 'fr',
        person: {
          lastName,
          phoneNumber: phone,
          languagePreference: document.documentElement.lang || 'fr',
        },
      });
    },
    onSuccess: ({ data }) => {
      setResult({
        ticketNumber: data.ticketNumber,
        trackingUrl: data.trackingUrl,
        queueName: queues.data?.data.items.find((item) => item.queueId === queueId)?.queueName,
      });
      setFlow('result');
    },
  });
  const lookup = useMutation({
    mutationFn: () =>
      registrationsControllerLookup(
        ticket
          ? { ticketNumber: ticket }
          : { lastName, scheduledTime: new Date(scheduledTime).toISOString() },
      ),
    onSuccess: ({ data }) => {
      setFound(data);
    },
  });
  const checkIn = useMutation({
    mutationFn: () => {
      if (!found) throw new Error('Rendez-vous requis');
      return registrationsControllerCheckIn(found.registrationId);
    },
    onSuccess: ({ data }) => {
      const trackingUrl = data.registrationTrackingToken
        ? `${window.location.origin}/track?token=${encodeURIComponent(data.registrationTrackingToken)}`
        : null;
      setResult({
        ticketNumber: data.ticketNumber,
        trackingUrl,
        queueName: queues.data?.data.items.find((item) => item.queueId === data.queueId)?.queueName,
      });
      setFlow('result');
    },
  });
  if (!validScope)
    return (
      <section className="kiosk-screen">
        <h1>Borne indisponible</h1>
        <p>Sélectionnez un site actif pour utiliser cette expérience.</p>
      </section>
    );
  if (!queues.isPending && queues.data?.data.items.length === 0)
    return (
      <section className="kiosk-screen experience-empty-state">
        <span className="empty-state-icon" aria-hidden="true">
          ≡
        </span>
        <h1>Aucune file configurée</h1>
        <p>Ce site ne dispose actuellement d’aucune file active.</p>
      </section>
    );
  return (
    <section
      className="kiosk-screen"
      onContextMenu={(event) => {
        event.preventDefault();
      }}
    >
      {watchdog.warning && flow !== 'home' ? (
        <div className="kiosk-timeout" role="alertdialog" aria-live="assertive">
          <strong>Session inactive</strong>
          <span>Effacement dans {watchdog.remainingSeconds} secondes.</span>
          <button type="button" className="button button-primary" onClick={watchdog.prolong}>
            Continuer
          </button>
        </div>
      ) : null}
      {flow === 'home' ? (
        <>
          <h1>Comment pouvons-nous vous aider ?</h1>
          <div className="kiosk-choices">
            <button
              type="button"
              onClick={() => {
                setFlow('walkin');
              }}
            >
              Je viens sans rendez-vous
            </button>
            <button
              type="button"
              onClick={() => {
                setFlow('appointment');
              }}
            >
              J’ai un rendez-vous
            </button>
          </div>
        </>
      ) : null}
      {flow === 'walkin' ? (
        <div className="kiosk-panel">
          <h1>Prendre un ticket</h1>
          <div className="kiosk-tiles">
            {queues.data?.data.items.map((queue) => (
              <button
                type="button"
                className={queueId === queue.queueId ? 'selected' : ''}
                key={queue.queueId}
                onClick={() => {
                  setQueueId(queue.queueId);
                  setTier(undefined);
                }}
              >
                {queue.queueName}
              </button>
            ))}
          </div>
          {queueId ? (
            <>
              <h2>Choisissez votre forfait</h2>
              <div className="kiosk-tiles">
                {tiers.data?.data.items
                  .filter((item) => item.isActive)
                  .map((item) => (
                    <button
                      type="button"
                      className={tier?.tierId === item.tierId ? 'selected' : ''}
                      key={item.tierId}
                      onClick={() => {
                        setTier(item);
                      }}
                    >
                      <strong>{item.tier?.tierName ?? `Forfait ${String(item.tierId)}`}</strong>
                      <span>
                        {new Intl.NumberFormat(undefined, {
                          style: 'currency',
                          currency: item.currency,
                        }).format(item.price)}
                      </span>
                    </button>
                  ))}
              </div>
            </>
          ) : null}
          <label>
            Nom
            <input
              autoComplete="off"
              value={lastName}
              onChange={(event) => {
                setLastName(event.target.value);
              }}
            />
          </label>
          <label>
            Téléphone
            <input
              autoComplete="off"
              inputMode="tel"
              placeholder="+33612345678"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
              }}
            />
          </label>
          <div className="kiosk-actions">
            <button type="button" onClick={purge}>
              Retour
            </button>
            <button
              type="button"
              className="primary"
              disabled={
                !queueId ||
                !tier ||
                !lastName.trim() ||
                !/^\+[1-9]\d{6,14}$/.test(phone) ||
                register.isPending
              }
              onClick={() => {
                register.mutate();
              }}
            >
              Obtenir mon ticket
            </button>
          </div>
        </div>
      ) : null}
      {flow === 'appointment' ? (
        <div className="kiosk-panel">
          <h1>Retrouver mon rendez-vous</h1>
          <label>
            Numéro de ticket
            <input
              autoComplete="off"
              value={ticket}
              onChange={(event) => {
                setTicket(event.target.value);
              }}
            />
          </label>
          <p className="separator">ou</p>
          <label>
            Nom
            <input
              autoComplete="off"
              value={lastName}
              onChange={(event) => {
                setLastName(event.target.value);
              }}
            />
          </label>
          <label>
            Heure prévue
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(event) => {
                setScheduledTime(event.target.value);
              }}
            />
          </label>
          <button
            type="button"
            className="primary"
            disabled={(!ticket.trim() && (!lastName.trim() || !scheduledTime)) || lookup.isPending}
            onClick={() => {
              lookup.mutate();
            }}
          >
            Rechercher
          </button>
          {found ? (
            <Card>
              <h2>Rendez-vous trouvé</h2>
              <p>
                Ticket <strong>{found.ticketNumber}</strong>
              </p>
              <p>
                {found.businessDate} ·{' '}
                {found.scheduledTime
                  ? new Date(found.scheduledTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'heure non fournie'}
              </p>
              <button
                type="button"
                className="button button-primary"
                disabled={checkIn.isPending}
                onClick={() => {
                  checkIn.mutate();
                }}
              >
                Confirmer ma présence
              </button>
            </Card>
          ) : null}
          <button type="button" onClick={purge}>
            Retour à l’accueil
          </button>
        </div>
      ) : null}
      {flow === 'result' && result ? (
        <div className="kiosk-result">
          <p>Votre ticket</p>
          <strong>{result.ticketNumber}</strong>
          <h1>{result.queueName}</h1>
          <TrackingQr value={result.trackingUrl} />
          <button
            type="button"
            onClick={() => {
              window.print();
            }}
          >
            Imprimer mon ticket
          </button>
          <button type="button" className="primary" onClick={purge}>
            Terminer
          </button>
        </div>
      ) : null}
    </section>
  );
}
