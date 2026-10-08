import { useEffect, useMemo, useRef, useState } from 'react';
import type { RegistrationPositionResponseDto } from '@/api/generated/models';
import { registrationsControllerGetPublicPosition } from '@/api/generated/registrations/registrations';
import { useSessionStore } from '@/core/auth/session-store';
import { PollingRealtimeGateway } from '@/core/realtime/realtime-gateway';
import { playChime } from './audio';
import { consumeOrRestoreOpaqueToken, trackingProgress } from './privacy';

export function TrackPage({ preview = false }: { preview?: boolean }) {
  const user = useSessionStore((state) => state.user);
  const [initialToken] = useState(() => consumeOrRestoreOpaqueToken(location.search, history));
  const [trackingId, setTrackingId] = useState(initialToken);
  const [token, setToken] = useState(initialToken);
  const [position, setPosition] = useState<RegistrationPositionResponseDto>();
  const [consent, setConsent] = useState(false);
  const previousStatus = useRef('');
  const gateway = useMemo(
    () =>
      token
        ? new PollingRealtimeGateway(
            async () =>
              (
                await registrationsControllerGetPublicPosition({
                  headers: { 'X-Registration-Token': token },
                })
              ).data,
            10000,
          )
        : null,
    [token],
  );
  useEffect(() => {
    if (!gateway) return;
    const unsubscribe = gateway.subscribe(setPosition);
    void gateway.connect();
    return () => {
      unsubscribe();
      gateway.disconnect();
    };
  }, [gateway]);
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
      <section className="tracking-screen">
        <h1>Lien de suivi invalide</h1>
        <p>Ouvrez le lien reçu avec votre ticket.</p>
      </section>
    );
  const progress = trackingProgress(position?.position);
  return (
    <section
      className={
        called && consent ? 'tracking-screen is-called has-alert-consent' : 'tracking-screen'
      }
    >
      {preview && user ? (
        <form
          className="tracking-lookup"
          onSubmit={(event) => {
            event.preventDefault();
            const nextToken = trackingId.trim();
            setPosition(undefined);
            previousStatus.current = '';
            setToken(nextToken);
          }}
        >
          <label htmlFor="tracking-id">Tracking ID</label>
          <div>
            <input
              id="tracking-id"
              type="text"
              autoComplete="off"
              value={trackingId}
              placeholder="Saisir le tracking ID"
              onChange={(event) => {
                setTrackingId(event.target.value);
              }}
            />
            <button type="submit" className="button button-primary" disabled={!trackingId.trim()}>
              Appliquer
            </button>
          </div>
        </form>
      ) : null}
      {!token ? (
        <div className="tracking-placeholder">
          <h1>Rechercher un ticket</h1>
          <p>Saisissez son tracking ID pour afficher sa position.</p>
        </div>
      ) : (
        <>
          <header>
            <span>Suivi de ticket</span>
            <strong>{position?.ticketNumber ?? '—'}</strong>
          </header>
          {called ? (
            <div className="tracking-called" role="alert">
              <h1>C’est votre tour !</h1>
              <p>
                Rendez-vous au guichet <strong>{position.counterNumber}</strong>
              </p>
            </div>
          ) : (
            <>
              <div
                className="tracking-gauge"
                role="progressbar"
                aria-label="Proximité estimée du passage"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                style={{ '--progress': `${String(progress * 3.6)}deg` } as React.CSSProperties}
              >
                <div>
                  <strong>{position?.position ?? '—'}</strong>
                  <span>position</span>
                </div>
              </div>
              <h1>{position?.queueName ?? 'Votre file'}</h1>
              <p className="tracking-wait">
                Attente estimée :{' '}
                <strong>
                  {position?.estimatedWaitMinutes !== undefined
                    ? `${String(position.estimatedWaitMinutes)} min`
                    : '—'}
                </strong>
              </p>
            </>
          )}
          <p>Statut : {position?.status ?? 'chargement'}</p>
          <button
            type="button"
            className="button button-primary"
            aria-pressed={consent}
            onClick={() => {
              setConsent((value) => !value);
            }}
          >
            {consent ? 'Alertes sonores activées' : 'Activer son et vibration'}
          </button>
        </>
      )}
    </section>
  );
}

import type React from 'react';
