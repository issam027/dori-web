import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '@/core/auth/session-store';
import { playChime } from './audio';
import { consumeOrRestoreOpaqueToken, trackingProgress } from './privacy';
import { usePublicTracking } from './hooks/usePublicExperiences';

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
    setError: setTrackingError,
  } = usePublicTracking(token);
  const [consent, setConsent] = useState(false);
  const previousStatus = useRef('');
  useEffect(() => {
    if (!gateway) return;
    const unsubscribe = gateway.subscribe((snapshot) => {
      setTrackingError(undefined);
      setPosition(snapshot);
    });
    void gateway.connect().catch(() => undefined);
    return () => {
      unsubscribe();
      gateway.disconnect();
    };
  }, [gateway, setPosition, setTrackingError]);

  const called = position?.status === 'called' || position?.counterNumber !== undefined;
  useEffect(() => {
    if (!consent || !called || previousStatus.current === 'called') {
      previousStatus.current = called ? 'called' : (position?.status ?? '');
      return;
    }
    previousStatus.current = 'called';
    playChime();
    if ('vibrate' in navigator) navigator.vibrate([250, 100, 250]);
  }, [called, consent, position?.status]);

  if (!token && !preview)
    return (
      <section className="tracking-screen tracking-invalid">
        <span className="tracking-brand">{__t('app.name')}</span>
        <h1>{__t('public-experiences.track.lienDeSuiviInvalide')}</h1>
        <p>{__t('public-experiences.track.ouvrezLeLienRecuAvecVotreTicket')}</p>
      </section>
    );

  const progress = trackingProgress(position?.position);
  return (
    <div className={preview ? 'tracking-preview-layout' : 'tracking-public-layout'}>
      {preview && user ? (
        <form
          className="tracking-lookup"
          onSubmit={(event) => {
            event.preventDefault();
            const nextToken = trackingId.trim();
            setPosition(undefined);
            setTrackingError(undefined);
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
            <button type="submit" className="button button-primary" disabled={!trackingId.trim()}>
              {__t('public-experiences.track.appliquer')}
            </button>
          </div>
        </form>
      ) : null}
      <section
        className={
          called && consent ? 'tracking-screen is-called has-alert-consent' : 'tracking-screen'
        }
      >
        <div className="tracking-device-notch" aria-hidden="true" />
        {!token ? (
          <div className="tracking-placeholder">
            <span className="tracking-brand">{__t('app.name')}</span>
            <h1>{__t('public-experiences.track.aucunTicketAffiche')}</h1>
            <p>{__t('public-experiences.track.utilisezLeChampDeTestSitueAuDessusDuTel')}</p>
          </div>
        ) : trackingError ? (
          <div className="tracking-placeholder tracking-error" role="alert">
            <span className="tracking-brand">{__t('app.name')}</span>
            <h1>{__t(`tracking.error.${trackingError}Title`)}</h1>
            <p>{__t(`tracking.error.${trackingError}Text`)}</p>
          </div>
        ) : (
          <>
            <header>
              <div className="tracking-brand-row">
                <span className="tracking-brand">{__t('app.name')}</span>
                <span className="tracking-live">
                  <i aria-hidden="true" /> {__t('common.enDirect')}
                </span>
              </div>
              <span>{__t('public-experiences.track.votreTicket')}</span>
              <strong>{position?.ticketNumber ?? '—'}</strong>
            </header>
            {called ? (
              <div className="tracking-called" role="alert">
                <span>{__t('public-experiences.track.cEstVotreTour')}</span>
                <h1>
                  {__t('common.guichet')}
                  {position.counterNumber ?? '—'}
                </h1>
                <p>{__t('public-experiences.track.merciDeVousPresenterAuPosteIndique')}</p>
              </div>
            ) : (
              <>
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
                    ? __t('public-experiences.track.environValue0Minutes', {
                        value0: String(position.estimatedWaitMinutes),
                      })
                    : __t('public-experiences.track.estimationEnCours')}
                </h1>
                <p className="tracking-queue">
                  {position?.queueName ?? __t('public-experiences.track.votreFile')}
                </p>
              </>
            )}
            <div className="tracking-guidance">
              <strong>
                {called
                  ? __t('public-experiences.track.rejoignezVotreGuichet')
                  : __t('public-experiences.track.restezAttentif')}
              </strong>
              <p>
                {called
                  ? __t('public-experiences.track.votreNumeroVientDEtreAppele')
                  : __t('public-experiences.track.cettePageVousIndiqueraVotreGuichetDes')}
              </p>
            </div>
            <p className="tracking-status">
              {__t('public-experiences.track.statut')}
              {position?.status ?? __t('public-experiences.track.chargement')}
            </p>
            <button
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
            </button>
          </>
        )}
      </section>
    </div>
  );
}
