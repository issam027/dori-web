import { useTranslation } from 'react-i18next';
import { useCallback, useState } from 'react';
import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import type {
  CreateRegistrationResponseDto,
  QueueTierResponseDto,
  RegistrationResponseDto,
} from '@/api/generated/models';
import { queuesControllerFindAll, queuesControllerGetStatus } from '@/api/generated/queues/queues';
import {
  registrationsControllerCheckIn,
  registrationsControllerLookup,
  registrationsControllerRegister,
} from '@/api/generated/registrations/registrations';
import {
  serviceTiersControllerGetQueueTiers,
  serviceTiersControllerGetRules,
} from '@/api/generated/tiers/tiers';
import { useSessionStore } from '@/core/auth/session-store';
import { useScopeStore } from '@/core/scope/scope-store';
import { Card } from '@/design-system/components/Card';
import { TrackingQr } from './TrackingQr';
import { kioskIdleMs, useKioskWatchdog } from './useKioskWatchdog';
import { presentError } from '@/core/notifications/error-presentation';
import { NormalizedApiError } from '@/core/errors/normalized-api-error';

type Flow = 'home' | 'walkin' | 'appointment' | 'result';
type Result = Pick<CreateRegistrationResponseDto, 'ticketNumber' | 'trackingUrl'> & {
  queueName?: string;
};

function trackingUrlOnCurrentHost(value?: string | null): string | null {
  if (!value) return null;
  const source = new URL(value, window.location.origin);
  const token = source.searchParams.get('token');
  if (!token) return null;
  return `${window.location.origin}/track?token=${encodeURIComponent(token)}`;
}

export function KioskPage() {
  const { t: __t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const activeSiteId = useScopeStore((state) => state.activeSiteId);
  const [flow, setFlow] = useState<Flow>('home');
  const [walkinStep, setWalkinStep] = useState<1 | 2 | 3 | 4>(1);
  const [queueId, setQueueId] = useState<number>();
  const [tier, setTier] = useState<QueueTierResponseDto>();
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('+33');
  const [phoneNational, setPhoneNational] = useState('');
  const [ticket, setTicket] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [found, setFound] = useState<RegistrationResponseDto>();
  const [result, setResult] = useState<Result>();
  const purge = useCallback(() => {
    setFlow('home');
    setWalkinStep(1);
    setQueueId(undefined);
    setTier(undefined);
    setLastName('');
    setFirstName('');
    setEmail('');
    setPhoneCountry('+33');
    setPhoneNational('');
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
  const queueStatuses = useQueries({
    queries: (queues.data?.data.items ?? []).map((queue) => ({
      queryKey: ['kiosk', 'queue-status', queue.queueId],
      queryFn: () => queuesControllerGetStatus(queue.queueId),
    })),
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
  const tierRules = useQueries({
    queries: (tiers.data?.data.items ?? []).map((item) => ({
      queryKey: ['kiosk', 'tier-rules', item.queueId, item.tierId],
      queryFn: () =>
        serviceTiersControllerGetRules(item.queueId, item.tierId, { page: 1, pageSize: 100 }),
      enabled: item.isActive,
    })),
  });
  const phone = `${phoneCountry}${phoneNational.replace(/\D/g, '').replace(/^0+/, '')}`;
  const phoneValid = /^\+[1-9]\d{6,14}$/.test(phone);
  const emailValid = !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
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
          ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
          ...(email.trim() ? { email: email.trim() } : {}),
          languagePreference: document.documentElement.lang || 'fr',
        },
      });
    },
    onSuccess: ({ data }) => {
      setResult({
        ticketNumber: data.ticketNumber,
        trackingUrl: trackingUrlOnCurrentHost(data.trackingUrl),
        queueName: queues.data?.data.items.find((item) => item.queueId === queueId)?.queueName,
      });
      setFlow('result');
    },
  });
  const registrationError = register.error
    ? register.error instanceof NormalizedApiError && register.error.status === 409
      ? 'Ce numéro de téléphone est déjà associé à une personne. Adressez-vous à l’accueil pour retrouver votre dossier.'
      : presentError(register.error).message
    : '';
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
        <h1>{__t('ui.public-experiences.kiosk_page.borne_indisponible_crj57x')}</h1>
        <p>
          {__t(
            'ui.public-experiences.kiosk_page.selectionnez_un_site_actif_pour_utiliser_cette_e_p6tmjj',
          )}
        </p>
      </section>
    );
  if (!queues.isPending && queues.data?.data.items.length === 0)
    return (
      <section className="kiosk-screen experience-empty-state">
        <span className="empty-state-icon" aria-hidden="true">
          ≡
        </span>
        <h1>{__t('ui.public-experiences.kiosk_page.aucune_file_configuree_1rf5ow7')}</h1>
        <p>
          {__t(
            'ui.public-experiences.kiosk_page.ce_site_ne_dispose_actuellement_d_aucune_file_ac_7s9gmf',
          )}
        </p>
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
          <strong>{__t('ui.public-experiences.kiosk_page.session_inactive_1jzrqso')}</strong>
          <span>
            {__t('ui.public-experiences.kiosk_page.effacement_dans_1ror7ih')}
            {watchdog.remainingSeconds} {__t('ui.public-experiences.kiosk_page.secondes_1kq4svx')}
          </span>
          <button type="button" className="button button-primary" onClick={watchdog.prolong}>
            {__t('ui.public-experiences.kiosk_page.continuer_1dbvwde')}
          </button>
        </div>
      ) : null}
      {flow === 'home' ? (
        <>
          <div className="kiosk-welcome">
            <h1>
              {__t('ui.public-experiences.kiosk_page.comment_pouvons_nous_vous_accueillir_1ii9ogv')}
            </h1>
            <p>
              {__t(
                'ui.public-experiences.kiosk_page.touchez_votre_situation_pour_commencer_covkye',
              )}
            </p>
          </div>
          <div className="kiosk-choices">
            <button
              type="button"
              onClick={() => {
                setFlow('walkin');
              }}
            >
              {__t('ui.public-experiences.kiosk_page.je_viens_sans_rendez_vous_1reoz0q')}
            </button>
            <button
              type="button"
              onClick={() => {
                setFlow('appointment');
              }}
            >
              {__t('ui.public-experiences.kiosk_page.j_ai_un_rendez_vous_fkfvt9')}
            </button>
          </div>
        </>
      ) : null}
      {flow === 'walkin' ? (
        <div className="kiosk-panel">
          <div className="kiosk-progress" aria-label={`Étape ${String(walkinStep)} sur 4`}>
            {[1, 2, 3, 4].map((step) => (
              <span className={step <= walkinStep ? 'done' : ''} key={step} />
            ))}
          </div>
          <div className="kiosk-stage-title">
            <span>
              {__t('ui.public-experiences.kiosk_page.etape_1mygumc')}
              {walkinStep} {__t('ui.public-experiences.kiosk_page.sur_4_145ldip')}
            </span>
            <h1>
              {
                [
                  '',
                  'Quel service souhaitez-vous ?',
                  'Vos informations',
                  'Votre niveau de service',
                  'Vérifiez votre demande',
                ][walkinStep]
              }
            </h1>
            <p>
              {
                [
                  '',
                  'Choisissez la file qui correspond à votre besoin.',
                  'Ces informations servent uniquement à créer et suivre votre ticket.',
                  'Les options proposées sont celles configurées pour cette file.',
                  'Confirmez les informations avant la création du ticket.',
                ][walkinStep]
              }
            </p>
          </div>
          {walkinStep === 1 ? (
            <div className="kiosk-tiles">
              {queues.data?.data.items.map((queue, index) => (
                <button
                  type="button"
                  className={queueId === queue.queueId ? 'selected' : ''}
                  key={queue.queueId}
                  onClick={() => {
                    setQueueId(queue.queueId);
                    setTier(undefined);
                  }}
                >
                  <small>
                    {__t('ui.public-experiences.kiosk_page.service_disponible_1wf3ald')}
                  </small>
                  <strong>{queue.queueName}</strong>
                  <span className="kiosk-wait-estimate">
                    {queueStatuses[index]?.data
                      ? __t(
                          'ui.expression.public-experiences.kiosk_page.environ_value0_min_value1_en_attente_fu76o',
                          {
                            value0: String(queueStatuses[index].data.data.estimatedWaitMinutes),
                            value1: String(queueStatuses[index].data.data.waitingCount),
                          },
                        )
                      : __t(
                          'ui.expression.public-experiences.kiosk_page.estimation_en_cours_oo9gjf',
                        )}
                  </span>
                  <span>
                    {queueId === queue.queueId
                      ? __t('ui.expression.public-experiences.kiosk_page.selectionne_vsjazw')
                      : __t(
                          'ui.expression.public-experiences.kiosk_page.choisir_ce_service_1ymypmf',
                        )}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          {walkinStep === 2 ? (
            <div className="kiosk-form-grid">
              <label>
                {__t('ui.public-experiences.kiosk_page.nom_de_famille_pi8khu')}
                <span className="required-mark">*</span>
                <input
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => {
                    setLastName(event.target.value);
                  }}
                />
              </label>
              <label>
                {__t('ui.public-experiences.kiosk_page.prenom_h4ba4')}
                <span className="optional">
                  {__t('ui.public-experiences.kiosk_page.optionnel_aqr9af')}
                </span>
                <input
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => {
                    setFirstName(event.target.value);
                  }}
                />
              </label>
              <label>
                {__t('ui.public-experiences.kiosk_page.email_inbfc7')}
                <span className="optional">
                  {__t('ui.public-experiences.kiosk_page.optionnel_aqr9af')}
                </span>
                <input
                  autoComplete="email"
                  type="email"
                  value={email}
                  aria-invalid={!emailValid}
                  onChange={(event) => {
                    setEmail(event.target.value);
                  }}
                />
                <small>
                  {emailValid
                    ? __t(
                        'ui.expression.public-experiences.kiosk_page.pour_recevoir_les_informations_si_le_service_1yuhipt',
                      )
                    : __t(
                        'ui.expression.public-experiences.kiosk_page.saisissez_une_adresse_email_valide_1vym397',
                      )}
                </small>
              </label>
              <label>
                {__t('ui.public-experiences.kiosk_page.telephone_p3xtrr')}
                <span className="required-mark">*</span>
                <div className="kiosk-phone-input">
                  <select
                    aria-label={__t('ui.public-experiences.kiosk_page.indicatif_pays_1krknxf')}
                    value={phoneCountry}
                    onChange={(event) => {
                      setPhoneCountry(event.target.value);
                    }}
                  >
                    <option value="+33">🇫🇷 +33</option>
                    <option value="+216">🇹🇳 +216</option>
                    <option value="+32">🇧🇪 +32</option>
                    <option value="+41">🇨🇭 +41</option>
                    <option value="+212">🇲🇦 +212</option>
                    <option value="+213">🇩🇿 +213</option>
                  </select>
                  <input
                    autoComplete="tel-national"
                    inputMode="numeric"
                    placeholder="6 12 34 56 78"
                    value={phoneNational}
                    onChange={(event) => {
                      setPhoneNational(event.target.value.replace(/[^0-9 ]/g, ''));
                    }}
                  />
                </div>
                <small>
                  {phoneValid
                    ? __t(
                        'ui.expression.public-experiences.kiosk_page.numero_enregistre_value0_18ylmh4',
                        { value0: phone },
                      )
                    : __t(
                        'ui.expression.public-experiences.kiosk_page.choisissez_le_pays_puis_saisissez_le_numero_ohnccb',
                      )}
                </small>
              </label>
            </div>
          ) : null}
          {walkinStep === 3 ? (
            <div className="kiosk-tiles kiosk-tier-tiles">
              {tiers.data?.data.items
                .filter((item) => item.isActive)
                .map((item) => {
                  const tierIndex = tiers.data.data.items.findIndex(
                    (candidate) => candidate.tierId === item.tierId,
                  );
                  const rules =
                    tierRules[tierIndex]?.data?.data.items.filter((rule) => rule.isActive) ?? [];
                  const hasWelcome = rules.some((rule) => rule.notificationType === 'welcome');
                  const hasThreshold = rules.some((rule) => rule.notificationType === 'threshold');
                  const hasSms = rules.some((rule) => rule.channel === 'sms');
                  const hasTracking = rules.some((rule) => rule.includeTrackingLink);
                  return (
                    <button
                      type="button"
                      className={tier?.tierId === item.tierId ? 'selected' : ''}
                      key={item.tierId}
                      onClick={() => {
                        setTier(item);
                      }}
                    >
                      <small>
                        {item.isDefault
                          ? __t('ui.expression.public-experiences.kiosk_page.recommande_ho1o0g')
                          : __t(
                              'ui.expression.public-experiences.kiosk_page.option_disponible_16egb8x',
                            )}
                      </small>
                      <strong>
                        {item.tier?.tierName ??
                          __t(
                            'ui.expression.public-experiences.kiosk_page.forfait_value0_1ftj76z',
                            { value0: String(item.tierId) },
                          )}
                      </strong>
                      <span>
                        {new Intl.NumberFormat(undefined, {
                          style: 'currency',
                          currency: item.currency,
                        }).format(item.price)}
                      </span>
                      <ul className="kiosk-tier-benefits">
                        <li className={hasSms ? 'included' : ''}>
                          {__t('ui.public-experiences.kiosk_page.sms_q3rkiy')}
                          {hasSms
                            ? __t('ui.expression.public-experiences.kiosk_page.inclus_1me6j59')
                            : __t(
                                'ui.expression.public-experiences.kiosk_page.non_configure_8cidzo',
                              )}
                        </li>
                        <li className={hasWelcome ? 'included' : ''}>
                          {__t('ui.public-experiences.kiosk_page.message_de_bienvenue_1pfo98i')}
                          {hasWelcome
                            ? __t('ui.expression.public-experiences.kiosk_page.inclus_1me6j59')
                            : __t(
                                'ui.expression.public-experiences.kiosk_page.non_configure_8cidzo',
                              )}
                        </li>
                        <li className={hasThreshold ? 'included' : ''}>
                          {__t('ui.public-experiences.kiosk_page.alerte_d_approche_1d977f9')}
                          {hasThreshold
                            ? __t('ui.expression.public-experiences.kiosk_page.incluse_nqq1lk')
                            : __t(
                                'ui.expression.public-experiences.kiosk_page.non_configuree_136zuar',
                              )}
                        </li>
                        <li className={hasTracking ? 'included' : ''}>
                          {__t('ui.public-experiences.kiosk_page.lien_de_suivi_zldvh6')}
                          {hasTracking
                            ? __t('ui.expression.public-experiences.kiosk_page.inclus_1me6j59')
                            : __t(
                                'ui.expression.public-experiences.kiosk_page.non_configure_8cidzo',
                              )}
                        </li>
                      </ul>
                    </button>
                  );
                })}
            </div>
          ) : null}
          {walkinStep === 4 ? (
            <div className="kiosk-review">
              <table>
                <tbody>
                  <tr>
                    <th>{__t('ui.public-experiences.kiosk_page.service_1eklb0k')}</th>
                    <td>
                      {queues.data?.data.items.find((item) => item.queueId === queueId)?.queueName}
                    </td>
                  </tr>
                  <tr>
                    <th>{__t('ui.public-experiences.kiosk_page.attente_estimee_wo76kg')}</th>
                    <td>
                      {queueId
                        ? __t(
                            'ui.expression.public-experiences.kiosk_page.value0_minutes_1yug5bb',
                            {
                              value0: String(
                                queueStatuses[
                                  queues.data?.data.items.findIndex(
                                    (item) => item.queueId === queueId,
                                  ) ?? -1
                                ]?.data?.data.estimatedWaitMinutes ?? '—',
                              ),
                            },
                          )
                        : '—'}
                    </td>
                  </tr>
                  <tr>
                    <th>{__t('ui.public-experiences.kiosk_page.nom_15eqct1')}</th>
                    <td>{lastName}</td>
                  </tr>
                  <tr>
                    <th>{__t('ui.public-experiences.kiosk_page.prenom_h4ba4')}</th>
                    <td>
                      {firstName ||
                        __t('ui.expression.public-experiences.kiosk_page.non_renseigne_un1dwo')}
                    </td>
                  </tr>
                  <tr>
                    <th>{__t('ui.public-experiences.kiosk_page.email_inbfc7')}</th>
                    <td>
                      {email ||
                        __t('ui.expression.public-experiences.kiosk_page.non_renseigne_un1dwo')}
                    </td>
                  </tr>
                  <tr>
                    <th>{__t('ui.public-experiences.kiosk_page.telephone_p3xtrr')}</th>
                    <td>{phone}</td>
                  </tr>
                  <tr>
                    <th>{__t('ui.public-experiences.kiosk_page.niveau_de_service_1g6qs3d')}</th>
                    <td>
                      {tier?.tier?.tierName ??
                        __t('ui.expression.public-experiences.kiosk_page.forfait_value0_1ftj76z', {
                          value0: String(tier?.tierId ?? ''),
                        })}
                    </td>
                  </tr>
                  <tr>
                    <th>{__t('ui.public-experiences.kiosk_page.tarif_1fpn4rv')}</th>
                    <td>
                      {tier
                        ? new Intl.NumberFormat(undefined, {
                            style: 'currency',
                            currency: tier.currency,
                          }).format(tier.price)
                        : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
          {registrationError ? (
            <div className="kiosk-error" role="alert">
              <strong>
                {__t('ui.public-experiences.kiosk_page.inscription_impossible_jqnxnm')}
              </strong>
              <p>{registrationError}</p>
              <span>
                {__t(
                  'ui.public-experiences.kiosk_page.verifiez_vos_informations_ou_demandez_de_l_aide__wwhufs',
                )}
              </span>
            </div>
          ) : null}
          <div className="kiosk-actions">
            <button
              type="button"
              onClick={() => {
                if (walkinStep === 1) purge();
                else setWalkinStep((walkinStep - 1) as 1 | 2 | 3);
              }}
            >
              {__t('ui.public-experiences.kiosk_page.retour_18dwyy2')}
            </button>
            <button
              type="button"
              className="primary"
              disabled={
                (walkinStep === 1 && !queueId) ||
                (walkinStep === 2 && (!lastName.trim() || !phoneValid || !emailValid)) ||
                (walkinStep === 3 && !tier) ||
                (walkinStep === 4 && register.isPending)
              }
              onClick={() => {
                if (walkinStep === 4) register.mutate();
                else setWalkinStep((walkinStep + 1) as 2 | 3 | 4);
              }}
            >
              {walkinStep === 4
                ? register.isPending
                  ? __t('ui.expression.public-experiences.kiosk_page.creation_uqudte')
                  : __t('ui.expression.public-experiences.kiosk_page.creer_mon_ticket_csckmy')
                : __t('ui.expression.public-experiences.kiosk_page.continuer_5vzly4')}
            </button>
          </div>
        </div>
      ) : null}
      {flow === 'appointment' ? (
        <div className="kiosk-panel">
          <h1>{__t('ui.public-experiences.kiosk_page.retrouver_mon_rendez_vous_1w6p9nd')}</h1>
          <label>
            {__t('ui.public-experiences.kiosk_page.numero_de_ticket_17ymtl0')}
            <input
              autoComplete="off"
              value={ticket}
              onChange={(event) => {
                setTicket(event.target.value);
              }}
            />
          </label>
          <p className="separator">{__t('ui.public-experiences.kiosk_page.ou_pkzwmp')}</p>
          <label>
            {__t('ui.public-experiences.kiosk_page.nom_15eqct1')}
            <input
              autoComplete="off"
              value={lastName}
              onChange={(event) => {
                setLastName(event.target.value);
              }}
            />
          </label>
          <label>
            {__t('ui.public-experiences.kiosk_page.heure_prevue_m6637b')}
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
            {__t('ui.public-experiences.kiosk_page.rechercher_1jzbmpc')}
          </button>
          {found ? (
            <Card>
              <h2>{__t('ui.public-experiences.kiosk_page.rendez_vous_trouve_u0yq2a')}</h2>
              <p>
                {__t('ui.public-experiences.kiosk_page.ticket_1nrpxxh')}
                <strong>{found.ticketNumber}</strong>
              </p>
              <p>
                {found.businessDate} ·{' '}
                {found.scheduledTime
                  ? new Date(found.scheduledTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : __t('ui.expression.public-experiences.kiosk_page.heure_non_fournie_cgiv4n')}
              </p>
              <button
                type="button"
                className="button button-primary"
                disabled={checkIn.isPending}
                onClick={() => {
                  checkIn.mutate();
                }}
              >
                {__t('ui.public-experiences.kiosk_page.confirmer_ma_presence_1efjx0r')}
              </button>
            </Card>
          ) : null}
          <button type="button" onClick={purge}>
            {__t('ui.public-experiences.kiosk_page.retour_a_l_accueil_48kqql')}
          </button>
        </div>
      ) : null}
      {flow === 'result' && result ? (
        <div className="kiosk-result">
          <div className="kiosk-result-heading">
            <span className="kiosk-result-check" aria-hidden="true">
              ✓
            </span>
            <div>
              <p className="eyebrow">
                {__t('ui.public-experiences.kiosk_page.inscription_confirmee_kt7nz')}
              </p>
              <h1>{__t('ui.public-experiences.kiosk_page.votre_ticket_est_pret_12garfj')}</h1>
            </div>
          </div>
          <div className="kiosk-ticket-result">
            <div>
              <small>{__t('ui.public-experiences.kiosk_page.numero_de_ticket_v2lgk')}</small>
              <strong>{result.ticketNumber}</strong>
              <span>{result.queueName}</span>
            </div>
            <TrackingQr value={result.trackingUrl} />
          </div>
          <p className="kiosk-result-guidance">
            {__t(
              'ui.public-experiences.kiosk_page.conservez_ce_ticket_et_suivez_l_ecran_de_salle_s_11uvt5o',
            )}
          </p>
          <div className="kiosk-result-actions">
            <button
              type="button"
              onClick={() => {
                window.print();
              }}
            >
              {__t('ui.public-experiences.kiosk_page.imprimer_mon_ticket_xbrafa')}
            </button>
            <button type="button" className="primary" onClick={purge}>
              {__t('ui.public-experiences.kiosk_page.terminer_19zht57')}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
