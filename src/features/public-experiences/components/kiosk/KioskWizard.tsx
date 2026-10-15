import { useTranslation } from 'react-i18next';
import { useCallback, useReducer, useState } from 'react';
import { CalendarCheck2, Check, Clock3, Search, Ticket, UserRound } from 'lucide-react';
import type {
  CreateRegistrationResponseDto,
  QueueTierResponseDto,
  RegistrationResponseDto,
} from '@/api/generated/models';
import { useSessionStore } from '@/core/auth/session-store';
import { useScopeStore } from '@/core/scope/scope-store';
import { Card } from '@/design-system/components/Card';
import { InternationalPhoneInput } from '@/design-system/components/InternationalPhoneInput';
import { TrackingQr } from '../../TrackingQr';
import { kioskIdleMs, useKioskWatchdog } from '../../useKioskWatchdog';
import { presentError } from '@/core/notifications/error-presentation';
import { NormalizedApiError } from '@/core/errors/normalized-api-error';
import { useKioskCatalog, useKioskRegistration } from '../../hooks/usePublicExperiences';

import { initialKioskWizardState, kioskWizardReducer } from '../../model/kiosk-wizard-state';
import {
  KioskIdentityStep,
  KioskQueueStep,
  KioskReviewStep,
  KioskTicketResult,
  KioskTierStep,
  KioskWelcomeStep,
} from './KioskSteps';
import { KioskTicketPrintDocument } from './KioskTicketPrintDocument';
import { trackingUrlFromToken } from '../../tracking-url';
import { useSite } from '@/features/portfolio/hooks/useSites';
type Result = Pick<CreateRegistrationResponseDto, 'ticketNumber'> & {
  trackingUrl: string | null;
  queueName?: string;
};

export function KioskWizard() {
  const { t: __t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const activeSiteId = useScopeStore((state) => state.activeSiteId);
  const site = useSite(activeSiteId);
  const [{ flow, walkinStep }, dispatch] = useReducer(kioskWizardReducer, initialKioskWizardState);
  const [queueId, setQueueId] = useState<number>();
  const [tier, setTier] = useState<QueueTierResponseDto>();
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [ticket, setTicket] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [found, setFound] = useState<RegistrationResponseDto>();
  const [result, setResult] = useState<Result>();
  const [printReady, setPrintReady] = useState(false);
  const handlePrintReady = useCallback(() => {
    setPrintReady(true);
  }, []);
  const purge = useCallback(() => {
    dispatch({ type: 'RESET' });
    setQueueId(undefined);
    setTier(undefined);
    setLastName('');
    setFirstName('');
    setEmail('');
    setPhone('');
    setTicket('');
    setScheduledTime('');
    setFound(undefined);
    setResult(undefined);
    setPrintReady(false);
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
  const { queues, queueStatuses, tiers, tierRules } = useKioskCatalog(
    activeSiteId,
    queueId,
    validScope,
  );
  const phoneValid = /^\+[1-9]\d{6,14}$/.test(phone);
  const emailValid = !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const { register, lookup, checkIn } = useKioskRegistration({
    createDto: () => {
      if (!queueId || !tier) throw new Error('File et forfait requis');
      return {
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
      };
    },
    onRegistered: (data) => {
      const trackingUrl = trackingUrlFromToken(data.registrationTrackingToken);
      setResult({
        ticketNumber: data.ticketNumber,
        trackingUrl,
        queueName: queues.data?.data.items.find((item) => item.queueId === queueId)?.queueName,
      });
      dispatch({ type: 'SHOW_RESULT' });
    },
    lookupDto: () =>
      ticket
        ? { ticketNumber: ticket }
        : { lastName, scheduledTime: new Date(scheduledTime).toISOString() },
    onLookup: (data) => {
      setFound(data);
    },
    selectedRegistration: () => found,
    onCheckedIn: (data) => {
      const trackingUrl = trackingUrlFromToken(data.registrationTrackingToken);
      setResult({
        ticketNumber: data.ticketNumber,
        trackingUrl,
        queueName: queues.data?.data.items.find((item) => item.queueId === data.queueId)?.queueName,
      });
      dispatch({ type: 'SHOW_RESULT' });
    },
  });
  const registrationError = register.error
    ? register.error instanceof NormalizedApiError && register.error.status === 409
      ? __t('kiosk.errors.phoneAlreadyExists')
      : presentError(register.error).message
    : '';
  if (!validScope)
    return (
      <section className="kiosk-screen">
        <h1>{__t('public-experiences.kiosk.borneIndisponible')}</h1>
        <p>{__t('common.selectionnezUnSiteActifPourUtiliserCetteE')}</p>
      </section>
    );
  if (!queues.isPending && queues.data?.data.items.length === 0)
    return (
      <section className="kiosk-screen experience-empty-state">
        <span className="empty-state-icon" aria-hidden="true">
          ≡
        </span>
        <h1>{__t('common.aucuneFileConfiguree')}</h1>
        <p>{__t('public-experiences.kiosk.ceSiteNeDisposeActuellementDAucuneFileAc')}</p>
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
          <strong>{__t('public-experiences.kiosk.sessionInactive')}</strong>
          <span>
            {__t('public-experiences.kiosk.effacementDans')}
            {watchdog.remainingSeconds} {__t('public-experiences.kiosk.secondes')}
          </span>
          <button type="button" className="button button-primary" onClick={watchdog.prolong}>
            {__t('common.continue')}
          </button>
        </div>
      ) : null}
      {flow === 'home' ? (
        <KioskWelcomeStep>
          <div className="kiosk-welcome">
            <h1>{__t('public-experiences.kiosk.commentPouvonsNousVousAccueillir')}</h1>
            <p>{__t('public-experiences.kiosk.touchezVotreSituationPourCommencer')}</p>
          </div>
          <div className="kiosk-choices">
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'START_WALKIN' });
              }}
            >
              {__t('public-experiences.kiosk.jeViensSansRendezVous')}
            </button>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'START_APPOINTMENT' });
              }}
            >
              {__t('public-experiences.kiosk.jAiUnRendezVous')}
            </button>
          </div>
        </KioskWelcomeStep>
      ) : null}
      {flow === 'walkin' ? (
        <div className="kiosk-panel">
          <div
            className="kiosk-progress"
            aria-label={__t('wizard.progress', { step: String(walkinStep), stepCount: '4' })}
          >
            {[1, 2, 3, 4].map((step) => (
              <span className={step <= walkinStep ? 'done' : ''} key={step} />
            ))}
          </div>
          <div className="kiosk-stage-title">
            <span>
              {__t('common.etape')}
              {walkinStep} {__t('kiosk.walkIn.totalSteps')}
            </span>
            <h1>
              {
                [
                  '',
                  __t('kiosk.walkIn.steps.service.title'),
                  __t('kiosk.walkIn.steps.identity.title'),
                  __t('kiosk.walkIn.steps.tier.title'),
                  __t('kiosk.walkIn.steps.review.title'),
                ][walkinStep]
              }
            </h1>
            <p>
              {
                [
                  '',
                  __t('kiosk.walkIn.steps.service.description'),
                  __t('kiosk.walkIn.steps.identity.description'),
                  __t('kiosk.walkIn.steps.tier.description'),
                  __t('kiosk.walkIn.steps.review.description'),
                ][walkinStep]
              }
            </p>
          </div>
          {walkinStep === 1 ? (
            <KioskQueueStep>
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
                    <small>{__t('public-experiences.kiosk.serviceDisponible')}</small>
                    <strong>{queue.queueName}</strong>
                    <span className="kiosk-wait-estimate">
                      {queueStatuses[index]?.data
                        ? __t('kiosk.queue.waitEstimate', {
                            value0: String(queueStatuses[index].data.data.estimatedWaitMinutes),
                            value1: String(queueStatuses[index].data.data.waitingCount),
                          })
                        : __t('public-experiences.kiosk.estimationEnCours')}
                    </span>
                    <span>
                      {queueId === queue.queueId
                        ? __t('common.selectionne')
                        : __t('public-experiences.kiosk.choisirCeService')}
                    </span>
                  </button>
                ))}
              </div>
            </KioskQueueStep>
          ) : null}
          {walkinStep === 2 ? (
            <KioskIdentityStep>
              <div className="kiosk-form-grid">
                <label>
                  <span className="kiosk-field-label">
                    {__t('public-experiences.kiosk.nomDeFamille')}
                    <span className="required-mark" aria-hidden="true">
                      *
                    </span>
                  </span>
                  <input
                    required
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(event) => {
                      setLastName(event.target.value);
                    }}
                  />
                </label>
                <label>
                  {__t('common.firstName')}
                  <input
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(event) => {
                      setFirstName(event.target.value);
                    }}
                  />
                </label>
                <label>
                  {__t('common.email')}
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
                      ? __t('public-experiences.kiosk.pourRecevoirLesInformationsSiLeService')
                      : __t('public-experiences.kiosk.saisissezUneAdresseEmailValide')}
                  </small>
                </label>
                <label>
                  <span className="kiosk-field-label">
                    {__t('common.phone')}
                    <span className="required-mark" aria-hidden="true">
                      *
                    </span>
                  </span>
                  <InternationalPhoneInput
                    value={phone}
                    onChange={setPhone}
                    countryLabel={__t('public-experiences.kiosk.indicatifPays')}
                    phoneLabel={__t('common.phone')}
                    required
                  />
                  <small>
                    {phoneValid
                      ? __t('kiosk.phone.savedNumber', { value0: phone })
                      : __t('public-experiences.kiosk.choisissezLePaysPuisSaisissezLeNumero')}
                  </small>
                </label>
              </div>
            </KioskIdentityStep>
          ) : null}
          {walkinStep === 3 ? (
            <KioskTierStep>
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
                    const hasThreshold = rules.some(
                      (rule) => rule.notificationType === 'threshold',
                    );
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
                            ? __t('public-experiences.kiosk.recommande')
                            : __t('public-experiences.kiosk.optionDisponible')}
                        </small>
                        <strong>
                          {item.tier?.tierName ??
                            __t('kiosk.tier.name', {
                              value0: String(item.tierId),
                            })}
                        </strong>
                        <span>
                          {new Intl.NumberFormat(undefined, {
                            style: 'currency',
                            currency: item.currency,
                          }).format(item.price)}
                        </span>
                        <ul className="kiosk-tier-benefits">
                          <li className={hasSms ? 'included' : ''}>
                            {__t('common.sms')}
                            {hasSms
                              ? __t('public-experiences.kiosk.inclus')
                              : __t('public-experiences.kiosk.nonConfigure')}
                          </li>
                          <li className={hasWelcome ? 'included' : ''}>
                            {__t('public-experiences.kiosk.messageDeBienvenue')}
                            {hasWelcome
                              ? __t('public-experiences.kiosk.inclus')
                              : __t('public-experiences.kiosk.nonConfigure')}
                          </li>
                          <li className={hasThreshold ? 'included' : ''}>
                            {__t('public-experiences.kiosk.alerteDApproche')}
                            {hasThreshold
                              ? __t('public-experiences.kiosk.incluse')
                              : __t('public-experiences.kiosk.nonConfiguree')}
                          </li>
                          <li className={hasTracking ? 'included' : ''}>
                            {__t('public-experiences.kiosk.lienDeSuivi')}
                            {hasTracking
                              ? __t('public-experiences.kiosk.inclus')
                              : __t('public-experiences.kiosk.nonConfigure')}
                          </li>
                        </ul>
                      </button>
                    );
                  })}
              </div>
            </KioskTierStep>
          ) : null}
          {walkinStep === 4 ? (
            <KioskReviewStep>
              <div className="kiosk-review">
                <table>
                  <tbody>
                    <tr>
                      <th>{__t('public-experiences.kiosk.service')}</th>
                      <td>
                        {
                          queues.data?.data.items.find((item) => item.queueId === queueId)
                            ?.queueName
                        }
                      </td>
                    </tr>
                    <tr>
                      <th>{__t('public-experiences.kiosk.attenteEstimee')}</th>
                      <td>
                        {queueId
                          ? __t('common.durationMinutes', {
                              value0: String(
                                queueStatuses[
                                  queues.data?.data.items.findIndex(
                                    (item) => item.queueId === queueId,
                                  ) ?? -1
                                ]?.data?.data.estimatedWaitMinutes ?? '—',
                              ),
                            })
                          : '—'}
                      </td>
                    </tr>
                    <tr>
                      <th>{__t('common.name')}</th>
                      <td>{lastName}</td>
                    </tr>
                    <tr>
                      <th>{__t('common.firstName')}</th>
                      <td>{firstName || __t('public-experiences.kiosk.nonRenseigne')}</td>
                    </tr>
                    <tr>
                      <th>{__t('common.email')}</th>
                      <td>{email || __t('public-experiences.kiosk.nonRenseigne')}</td>
                    </tr>
                    <tr>
                      <th>{__t('common.phone')}</th>
                      <td>{phone}</td>
                    </tr>
                    <tr>
                      <th>{__t('public-experiences.kiosk.niveauDeService')}</th>
                      <td>
                        {tier?.tier?.tierName ??
                          __t('kiosk.tier.name', {
                            value0: String(tier?.tierId ?? ''),
                          })}
                      </td>
                    </tr>
                    <tr>
                      <th>{__t('public-experiences.kiosk.tarif')}</th>
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
            </KioskReviewStep>
          ) : null}
          {registrationError ? (
            <div className="kiosk-error" role="alert">
              <strong>{__t('public-experiences.kiosk.inscriptionImpossible')}</strong>
              <p>{registrationError}</p>
              <span>
                {__t('public-experiences.kiosk.verifiezVosInformationsOuDemandezDeLAide')}
              </span>
            </div>
          ) : null}
          <div className="kiosk-actions">
            <button
              type="button"
              onClick={() => {
                if (walkinStep === 1) purge();
                else dispatch({ type: 'BACK' });
              }}
            >
              {__t('common.retour')}
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
                else dispatch({ type: 'NEXT' });
              }}
            >
              {walkinStep === 4
                ? register.isPending
                  ? __t('common.creation')
                  : __t('public-experiences.kiosk.creerMonTicket')
                : __t('common.continuer')}
            </button>
          </div>
        </div>
      ) : null}
      {flow === 'appointment' ? (
        <div className="kiosk-panel kiosk-appointment-panel">
          <div className="kiosk-stage-title">
            <span className="kiosk-appointment-icon" aria-hidden="true">
              <CalendarCheck2 />
            </span>
            <h1>{__t('public-experiences.kiosk.retrouverMonRendezVous')}</h1>
          </div>
          <div className="kiosk-appointment-searches">
            <section>
              <div className="kiosk-appointment-option-title">
                <Ticket aria-hidden="true" />
                <strong>{__t('public-experiences.kiosk.numeroDeTicket')}</strong>
              </div>
              <input
                autoComplete="off"
                value={ticket}
                onChange={(event) => {
                  setTicket(event.target.value);
                }}
              />
            </section>
            <span className="kiosk-appointment-or">{__t('public-experiences.kiosk.ou')}</span>
            <section>
              <div className="kiosk-appointment-option-title">
                <UserRound aria-hidden="true" />
                <strong>{__t('common.name')}</strong>
              </div>
              <input
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => {
                  setLastName(event.target.value);
                }}
              />
              <label className="kiosk-appointment-time">
                <Clock3 aria-hidden="true" />
                <span>{__t('public-experiences.kiosk.heurePrevue')}</span>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(event) => {
                    setScheduledTime(event.target.value);
                  }}
                />
              </label>
            </section>
          </div>
          <div className="kiosk-appointment-actions">
            <button type="button" onClick={purge}>
              {__t('common.retourALAccueil')}
            </button>
            <button
              type="button"
              className="primary"
              disabled={
                (!ticket.trim() && (!lastName.trim() || !scheduledTime)) || lookup.isPending
              }
              onClick={() => {
                lookup.mutate();
              }}
            >
              <Search aria-hidden="true" />
              {__t('common.search')}
            </button>
          </div>
          {found ? (
            <Card className="kiosk-appointment-found">
              <span className="kiosk-result-check" aria-hidden="true">
                ✓
              </span>
              <div>
                <h2>{__t('public-experiences.kiosk.rendezVousTrouve')}</h2>
                <p>
                  {__t('common.ticket')} <strong>{found.ticketNumber}</strong>
                </p>
                <p>
                  {found.businessDate} ·{' '}
                  {found.scheduledTime
                    ? new Date(found.scheduledTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : __t('public-experiences.kiosk.heureNonFournie')}
                </p>
              </div>
              <button
                type="button"
                className="button button-primary"
                disabled={checkIn.isPending}
                onClick={() => {
                  checkIn.mutate();
                }}
              >
                {__t('public-experiences.kiosk.confirmerMaPresence')}
              </button>
            </Card>
          ) : null}
        </div>
      ) : null}
      {flow === 'result' && result ? (
        <KioskTicketResult>
          <div className="kiosk-result-heading">
            <span className="kiosk-result-check" aria-hidden="true">
              <Check />
            </span>
            <div>
              <p className="eyebrow">{__t('common.registrationConfirmed')}</p>
              <h1>{__t('public-experiences.kiosk.votreTicketEstPret')}</h1>
            </div>
          </div>
          <div className="kiosk-ticket-result">
            <div>
              <small>{__t('kiosk.ticket.numberHeading')}</small>
              <strong>{result.ticketNumber}</strong>
              <span>{result.queueName}</span>
            </div>
            <TrackingQr value={result.trackingUrl} />
          </div>
          <p className="kiosk-result-guidance">
            {__t('public-experiences.kiosk.conservezCeTicketEtSuivezLEcranDeSalleS')}
          </p>
          <div className="kiosk-result-actions">
            <button
              type="button"
              disabled={!printReady}
              onClick={() => {
                document.body.dataset.printKioskTicket = 'true';
                const cleanup = () => {
                  delete document.body.dataset.printKioskTicket;
                };
                window.addEventListener('afterprint', cleanup, { once: true });
                window.print();
                window.setTimeout(cleanup, 30_000);
              }}
            >
              {__t('public-experiences.kiosk.imprimerMonTicket')}
            </button>
            <button type="button" className="primary" onClick={purge}>
              {__t('common.terminer')}
            </button>
          </div>
          <KioskTicketPrintDocument
            ticketNumber={result.ticketNumber}
            siteName={site.data?.data.siteName}
            queueName={result.queueName}
            trackingUrl={result.trackingUrl}
            onReady={handlePrintReady}
          />
        </KioskTicketResult>
      ) : null}
    </section>
  );
}
