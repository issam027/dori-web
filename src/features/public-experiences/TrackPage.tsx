import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RegistrationPositionResponseDto } from '@/api/generated/models';
import { registrationsControllerGetPublicPosition } from '@/api/generated/registrations/registrations';
import { useSessionStore } from '@/core/auth/session-store';
import { PollingRealtimeGateway } from '@/core/realtime/realtime-gateway';
import { NormalizedApiError } from '@/core/errors/normalized-api-error';
import { playChime } from './audio';
import { consumeOrRestoreOpaqueToken, trackingProgress } from './privacy';

export function TrackPage({ preview = false }: { preview?: boolean }) {
  const { t: __t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const [initialToken] = useState(() => consumeOrRestoreOpaqueToken(location.search, history));
  const [trackingId, setTrackingId] = useState(initialToken);
  const [token, setToken] = useState(initialToken);
  const [position, setPosition] = useState<RegistrationPositionResponseDto>();
  const [trackingError, setTrackingError] = useState<'invalid' | 'expired' | 'unavailable'>();
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
            (error) => {
              if (error instanceof NormalizedApiError) {
                const code = error.code.toUpperCase();
                if (error.status === 410 || code.includes('EXPIRED')) {
                  setTrackingError('expired');
                  return;
                }
                if (error.status === 404 || code.includes('INVALID')) {
                  setTrackingError('invalid');
                  return;
                }
              }
              setTrackingError('unavailable');
            },
          )
        : null,
    [token],
  );

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
      <section className="tracking-screen tracking-invalid">
        <span className="tracking-brand">
          {__t('ui.public-experiences.track_page.dori_9y7skh')}
        </span>
        <h1>{__t('ui.public-experiences.track_page.lien_de_suivi_invalide_1p5x488')}</h1>
        <p>
          {__t('ui.public-experiences.track_page.ouvrez_le_lien_recu_avec_votre_ticket_stx7r1')}
        </p>
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
              <strong>
                {__t('ui.public-experiences.track_page.tester_un_suivi_reel_1sdkxl1')}
              </strong>
              <span>
                {__t(
                  'ui.public-experiences.track_page.ce_champ_est_visible_uniquement_dans_l_apercu_in_1bkpujh',
                )}
              </span>
            </div>
            <label htmlFor="tracking-id">
              {__t('ui.public-experiences.track_page.tracking_id_1tjzg1l')}
            </label>
          </div>
          <div className="tracking-lookup-actions">
            <input
              id="tracking-id"
              type="text"
              autoComplete="off"
              value={trackingId}
              placeholder={__t('ui.public-experiences.track_page.saisir_le_tracking_id_pvcg03')}
              onChange={(event) => {
                setTrackingId(event.target.value);
              }}
            />
            <button type="submit" className="button button-primary" disabled={!trackingId.trim()}>
              {__t('ui.public-experiences.track_page.appliquer_1qx2qgq')}
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
            <span className="tracking-brand">
              {__t('ui.public-experiences.track_page.dori_9y7skh')}
            </span>
            <h1>{__t('ui.public-experiences.track_page.aucun_ticket_affiche_1bhhh0x')}</h1>
            <p>
              {__t(
                'ui.public-experiences.track_page.utilisez_le_champ_de_test_situe_au_dessus_du_tel_1s2i7dy',
              )}
            </p>
          </div>
        ) : trackingError ? (
          <div className="tracking-placeholder tracking-error" role="alert">
            <span className="tracking-brand">
              {__t('ui.public-experiences.track_page.dori_9y7skh')}
            </span>
            <h1>{__t(`tracking.error.${trackingError}Title`)}</h1>
            <p>{__t(`tracking.error.${trackingError}Text`)}</p>
          </div>
        ) : (
          <>
            <header>
              <div className="tracking-brand-row">
                <span className="tracking-brand">
                  {__t('ui.public-experiences.track_page.dori_9y7skh')}
                </span>
                <span className="tracking-live">
                  <i aria-hidden="true" />{' '}
                  {__t('ui.public-experiences.track_page.en_direct_10riirr')}
                </span>
              </div>
              <span>{__t('ui.public-experiences.track_page.votre_ticket_15st9il')}</span>
              <strong>{position?.ticketNumber ?? '—'}</strong>
            </header>
            {called ? (
              <div className="tracking-called" role="alert">
                <span>{__t('ui.public-experiences.track_page.c_est_votre_tour_15u43pb')}</span>
                <h1>
                  {__t('ui.public-experiences.track_page.guichet_15ztv8y')}
                  {position.counterNumber ?? '—'}
                </h1>
                <p>
                  {__t(
                    'ui.public-experiences.track_page.merci_de_vous_presenter_au_poste_indique_jhsjl9',
                  )}
                </p>
              </div>
            ) : (
              <>
                <div
                  className="tracking-gauge"
                  role="progressbar"
                  aria-label={__t(
                    'ui.public-experiences.track_page.proximite_estimee_du_passage_12j09z5',
                  )}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  style={{ '--progress': `${String(progress * 3.6)}deg` } as React.CSSProperties}
                >
                  <div>
                    <span>{__t('ui.public-experiences.track_page.position_1quewx6')}</span>
                    <strong>{position?.position ?? '—'}</strong>
                    <small>{__t('ui.public-experiences.track_page.dans_la_file_1up9yai')}</small>
                  </div>
                </div>
                <h1 className="tracking-estimate">
                  {position?.estimatedWaitMinutes !== undefined
                    ? __t(
                        'ui.expression.public-experiences.track_page.environ_value0_minutes_atcys8',
                        { value0: String(position.estimatedWaitMinutes) },
                      )
                    : __t('ui.expression.public-experiences.track_page.estimation_en_cours_ysdivz')}
                </h1>
                <p className="tracking-queue">
                  {position?.queueName ??
                    __t('ui.expression.public-experiences.track_page.votre_file_vz9wq3')}
                </p>
              </>
            )}
            <div className="tracking-guidance">
              <strong>
                {called
                  ? __t(
                      'ui.expression.public-experiences.track_page.rejoignez_votre_guichet_105p961',
                    )
                  : __t('ui.expression.public-experiences.track_page.restez_attentif_55cdo3')}
              </strong>
              <p>
                {called
                  ? __t(
                      'ui.expression.public-experiences.track_page.votre_numero_vient_d_etre_appele_1o6w7p0',
                    )
                  : __t(
                      'ui.expression.public-experiences.track_page.cette_page_vous_indiquera_votre_guichet_des__1d2v3me',
                    )}
              </p>
            </div>
            <p className="tracking-status">
              {__t('ui.public-experiences.track_page.statut_1gq3888')}
              {position?.status ??
                __t('ui.expression.public-experiences.track_page.chargement_1w7q2bd')}
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
                ? __t('ui.expression.public-experiences.track_page.son_et_vibration_actives_q1p8ol')
                : __t(
                    'ui.expression.public-experiences.track_page.activer_son_et_vibration_1op3ifm',
                  )}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
