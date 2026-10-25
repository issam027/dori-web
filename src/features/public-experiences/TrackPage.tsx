import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock3, RefreshCw, TriangleAlert, XCircle } from 'lucide-react';
import type { RegistrationPositionResponseDto } from '@/api/generated/models';
import { useSessionStore } from '@/core/auth/session-store';
import { useQueueTrackingRealtime } from '@/core/realtime/use-queue-realtime';
import { playChime } from './audio';
import { consumeOrRestoreOpaqueToken, trackingProgress } from './privacy';
import { usePublicTracking } from './hooks/usePublicExperiences';
import { Button } from '@/design-system/components/Button';

type TrackingPhase = 'far' | 'near' | 'next' | 'called' | 'completed';

const terminalStatuses = new Set(['served', 'no_show', 'cancelled', 'expired', 'closed']);

function trackingPhase(position?: RegistrationPositionResponseDto): TrackingPhase {
  if (
    position &&
    (terminalStatuses.has(position.registrationStatus) || terminalStatuses.has(position.status))
  )
    return 'completed';
  if (
    position?.status === 'called' ||
    position?.counterName ||
    position?.counterNumber !== undefined
  )
    return 'called';
  if (position?.position === 1) return 'next';
  if (position?.position !== undefined && position.position < 5) return 'near';
  return 'far';
}

export function TrackPage({ preview = false }: { preview?: boolean }) {
  const { t: __t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const [initialToken] = useState(() => consumeOrRestoreOpaqueToken(location.search, history));
  const [trackingId, setTrackingId] = useState(initialToken);
  const [token, setToken] = useState(initialToken);
  const {
    gateway,
    position,
    setPosition,
    error: trackingError,
    setError,
  } = usePublicTracking(token);
  const [consent, setConsent] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const previousStatus = useRef('');
  const phase = trackingPhase(position);
  const called = phase === 'called';
  const completed = phase === 'completed';

  useQueueTrackingRealtime({
    queueIds: position?.queueId ? [position.queueId] : [],
    registrationToken: token,
    onEvent: () => {
      void gateway?.refresh().catch(() => undefined);
    },
    onReconnect: () => {
      void gateway?.refresh().catch(() => undefined);
    },
  });

  useEffect(() => {
    if (!gateway) return;
    let terminalSnapshotReceived = false;
    const unsubscribe = gateway.subscribe((snapshot) => {
      setError(undefined);
      setPosition(snapshot);
      if (
        terminalStatuses.has(snapshot.registrationStatus) ||
        terminalStatuses.has(snapshot.status)
      ) {
        terminalSnapshotReceived = true;
        gateway.disconnect();
      }
    });
    void gateway
      .connect()
      .then(() => {
        // The first snapshot is fetched before the polling timer is installed.
        if (terminalSnapshotReceived) gateway.disconnect();
      })
      .catch(() => undefined);
    return () => {
      unsubscribe();
      gateway.disconnect();
    };
  }, [gateway, setError, setPosition]);

  useEffect(() => {
    if (!consent || !called || previousStatus.current === 'called') {
      previousStatus.current = called ? 'called' : (position?.status ?? '');
      return;
    }
    previousStatus.current = 'called';
    playChime();
    if ('vibrate' in navigator) navigator.vibrate([250, 100, 250]);
  }, [called, consent, position?.status]);

  const refresh = async () => {
    if (!gateway || refreshing) return;
    setRefreshing(true);
    try {
      await gateway.refresh();
    } catch {
      // The gateway maps transport errors to the dedicated tracking error screen.
    } finally {
      setRefreshing(false);
    }
  };

  if (!token && !preview)
    return (
      <section className="tracking-screen tracking-invalid">
        <span className="tracking-brand">{__t('app.name')}</span>
        <h1>{__t('public-experiences.track.lienDeSuiviInvalide')}</h1>
        <p>{__t('public-experiences.track.ouvrezLeLienRecuAvecVotreTicket')}</p>
      </section>
    );

  const progress = trackingProgress(position?.position);
  const status = position?.registrationStatus ?? position?.status ?? 'waiting';
  const calledAt = position?.calledAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(position.calledAt),
      )
    : null;
  const destination =
    position?.counterName?.trim() ||
    (position?.counterNumber !== undefined
      ? __t('tracking.counterFallback', { counter: String(position.counterNumber) })
      : __t('tracking.counterPending'));

  return (
    <div className={preview ? 'tracking-preview-layout' : 'tracking-public-layout'}>
      {preview && user ? (
        <form
          className="tracking-lookup"
          onSubmit={(event) => {
            event.preventDefault();
            const nextToken = trackingId.trim();
            setPosition(undefined);
            setError(undefined);
            previousStatus.current = '';
            setToken(nextToken);
          }}
        >
          <div>
            <div>
              <strong>{__t('public-experiences.track.testerUnSuiviReel')}</strong>
              <span>
                {__t('public-experiences.track.ceChampEstVisibleUniquementDansLApercuIn')}
              </span>
            </div>
            <label htmlFor="tracking-id">{__t('public-experiences.track.trackingId')}</label>
          </div>
          <div className="tracking-lookup-actions">
            <input
              id="tracking-id"
              type="text"
              autoComplete="off"
              value={trackingId}
              placeholder={__t('public-experiences.track.saisirLeTrackingId')}
              onChange={(event) => {
                setTrackingId(event.target.value);
              }}
            />
            <Button
              variant="unstyled"
              type="submit"
              className="button button-primary"
              disabled={!trackingId.trim()}
            >
              {__t('public-experiences.track.appliquer')}
            </Button>
          </div>
        </form>
      ) : null}
      <section
        className={`tracking-screen tracking-phase-${phase} tracking-status-${status}${called && consent ? ' has-alert-consent' : ''}`}
      >
        <div className="tracking-device-notch" aria-hidden="true" />
        {!token ? (
          <div className="tracking-placeholder">
            <span className="tracking-brand">{__t('app.name')}</span>
            <h1>{__t('public-experiences.track.aucunTicketAffiche')}</h1>
            <p>{__t('public-experiences.track.utilisezLeChampDeTestSitueAuDessusDuTel')}</p>
          </div>
        ) : trackingError ? (
          <div
            className={`tracking-placeholder tracking-error tracking-error-${trackingError}`}
            role="alert"
          >
            <span className="tracking-error-icon" aria-hidden="true">
              {trackingError === 'expired' ? <Clock3 /> : <TriangleAlert />}
            </span>
            <span className="tracking-brand">{__t('app.name')}</span>
            <h1>{__t(`tracking.error.${trackingError}Title`)}</h1>
            <p>{__t(`tracking.error.${trackingError}Text`)}</p>
          </div>
        ) : (
          <>
            <header>
              <div className="tracking-brand-row">
                <span className="tracking-brand">{__t('app.name')}</span>
                {!completed ? (
                  <span className="tracking-live">
                    <i aria-hidden="true" /> {__t('common.enDirect')}
                  </span>
                ) : null}
              </div>
              <span>{__t('public-experiences.track.votreTicket')}</span>
              <strong>{position?.ticketNumber ?? '—'}</strong>
              <span className="tracking-queue-badge">
                {position?.queueName ?? __t('public-experiences.track.votreFile')}
              </span>
            </header>

            {completed ? (
              <div className="tracking-completed" role="status">
                <span className="tracking-completed-icon" aria-hidden="true">
                  {status === 'served' ? <CheckCircle2 /> : <XCircle />}
                </span>
                <h1>{__t(`tracking.completed.${status}.title`)}</h1>
                <p>{__t(`tracking.completed.${status}.text`)}</p>
                {calledAt ? (
                  <dl className="tracking-call-details">
                    <div>
                      <dt>{__t('tracking.calledAt')}</dt>
                      <dd>{calledAt}</dd>
                    </div>
                    {position?.counterName || position?.counterNumber !== undefined ? (
                      <div>
                        <dt>{__t('tracking.calledAtCounter')}</dt>
                        <dd>{destination}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}
              </div>
            ) : called ? (
              <div className="tracking-called" role="alert">
                <span>{__t('public-experiences.track.cEstVotreTour')}</span>
                <h1>{destination}</h1>
                <p>{__t('public-experiences.track.merciDeVousPresenterAuPosteIndique')}</p>
                {calledAt ? <time>{__t('tracking.calledAtValue', { date: calledAt })}</time> : null}
              </div>
            ) : (
              <>
                <div className={`tracking-proximity tracking-proximity-${phase}`}>
                  <strong>{__t(`tracking.waiting.${phase}.title`)}</strong>
                  <span>{__t(`tracking.waiting.${phase}.text`)}</span>
                </div>
                <div
                  className="tracking-gauge"
                  role="progressbar"
                  aria-label={__t('public-experiences.track.proximiteEstimeeDuPassage')}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  style={{ '--progress': `${String(progress * 3.6)}deg` } as React.CSSProperties}
                >
                  <div>
                    <span>{__t('common.position')}</span>
                    <strong>{position?.position ?? '—'}</strong>
                    <small>{__t('public-experiences.track.dansLaFile')}</small>
                  </div>
                </div>
                <h1 className="tracking-estimate">
                  {position?.estimatedWaitMinutes !== undefined
                    ? __t('tracking.estimatedMinutes', {
                        value0: String(position.estimatedWaitMinutes),
                      })
                    : __t('public-experiences.track.estimationEnCours')}
                </h1>
              </>
            )}

            {!completed ? (
              <div className="tracking-actions">
                <Button
                  variant="unstyled"
                  type="button"
                  className="button tracking-refresh"
                  disabled={refreshing}
                  onClick={() => void refresh()}
                  aria-busy={refreshing}
                >
                  <RefreshCw
                    className={refreshing ? 'is-spinning' : undefined}
                    aria-hidden="true"
                  />
                  {__t('tracking.refresh')}
                </Button>
                <Button
                  variant="unstyled"
                  type="button"
                  className="button button-primary tracking-consent"
                  aria-pressed={consent}
                  onClick={() => {
                    setConsent((value) => !value);
                  }}
                >
                  {consent
                    ? __t('public-experiences.track.sonEtVibrationActives')
                    : __t('public-experiences.track.activerSonEtVibration')}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
