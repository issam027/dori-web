import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { PassageSummary } from '@/features/queue-operations/operation-store';

export interface PassageSiteDetails {
  siteName: string;
  timezone?: string;
  siteLocation?: string;
  siteLogoUrl?: string;
}

export function PassagePrintDocument({
  passage,
  site,
}: {
  passage: PassageSummary;
  site: PassageSiteDetails;
}) {
  const { t, i18n } = useTranslation();
  const timezone = site.timezone || undefined;
  const arrivedAt = passage.arrivedAt ? new Date(passage.arrivedAt) : null;
  const calledAt = new Date(passage.calledAt);
  const closedAt = new Date(passage.closedAt);
  const passageDate = arrivedAt ?? calledAt;
  const generatedAt = new Date();
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long', timeZone: timezone });
  const time = new Intl.DateTimeFormat(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  });
  const generated = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'long',
    timeStyle: 'short',
    hour12: false,
    timeZone: timezone,
  });
  const fallbackNameParts = passage.personName.trim().split(/\s+/);
  const firstName = passage.firstName ?? fallbackNameParts.shift() ?? '';
  const lastName = passage.lastName ?? fallbackNameParts.join(' ');
  const reference = `DORIFY-PASSAGE-${passage.registrationId}`;
  const unknown = t('passageReceipt.notRecorded');

  return createPortal(
    <article className="passage-print-document" aria-hidden="true">
      <header className="attestation-header">
        <div className="attestation-brand">
          {site.siteLogoUrl ? <img src={site.siteLogoUrl} alt="" /> : null}
          <div>
            <strong>{t('app.name')}</strong>
            <span>
              {t('passageCertificate.tagline', {
                defaultValue: 'Gestion intelligente des files d’attente',
              })}
            </span>
          </div>
        </div>
      </header>

      <section className="attestation-title">
        <h1>{t('passageReceipt.title')}</h1>
      </section>

      <section className="attestation-establishment">
        <span>
          {t('passageCertificate.establishment', { defaultValue: 'ÉTABLISSEMENT D’ACCUEIL' })}
        </span>
        <strong>{site.siteName}</strong>
        {site.siteLocation ? <small>{site.siteLocation}</small> : null}
        <time dateTime={passageDate.toISOString()}>{date.format(passageDate)}</time>
      </section>

      <p className="attestation-introduction">
        {t('passageCertificate.introduction', {
          defaultValue:
            'Nous attestons que la personne désignée ci-dessous s’est présentée dans notre établissement à la date et aux horaires indiqués, dans le cadre de son passage et de sa prise en charge par notre système de gestion des files d’attente.',
        })}
      </p>

      <div className="attestation-two-columns">
        <section className="attestation-panel">
          <h2>{t('passageCertificate.identity', { defaultValue: 'IDENTITÉ DU VISITEUR' })}</h2>
          <dl>
            <div>
              <dt>{t('passageReceipt.lastName')}</dt>
              <dd>{lastName || unknown}</dd>
            </div>
            <div>
              <dt>{t('passageReceipt.firstName')}</dt>
              <dd>{firstName || unknown}</dd>
            </div>
          </dl>
        </section>
        <section className="attestation-panel attestation-ticket">
          <h2>
            {t('passageCertificate.ticketDetails', { defaultValue: 'INFORMATIONS DU TICKET' })}
          </h2>
          <dl>
            <div>
              <dt>{t('passageReceipt.ticket')}</dt>
              <dd>{passage.ticketNumber}</dd>
            </div>
            {passage.threadNumber > 0 ? (
              <div>
                <dt>{t('passageReceipt.desk')}</dt>
                <dd>{t('common.numberAbbreviation', { value: passage.threadNumber })}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      </div>

      <section className="attestation-timeline">
        <h2>{t('passageCertificate.timeline', { defaultValue: 'RÉCAPITULATIF DU PASSAGE' })}</h2>
        <div className="attestation-events">
          <div>
            <span>1</span>
            <small>{t('passageCertificate.arrival', { defaultValue: 'HEURE D’ARRIVÉE' })}</small>
            <strong>{arrivedAt ? time.format(arrivedAt) : unknown}</strong>
            <p>
              {t('passageCertificate.arrivalHelp', {
                defaultValue: 'Enregistrement de l’arrivée dans le système.',
              })}
            </p>
          </div>
          <div>
            <span>2</span>
            <small>{t('passageCertificate.call', { defaultValue: 'HEURE D’APPEL' })}</small>
            <strong>{time.format(calledAt)}</strong>
            <p>
              {t('passageCertificate.callHelp', {
                defaultValue: 'Appel du ticket par le système.',
              })}
            </p>
          </div>
          <div>
            <span>3</span>
            <small>
              {t('passageCertificate.end', { defaultValue: 'HEURE DE FIN DE PASSAGE' })}
            </small>
            <strong>{time.format(closedAt)}</strong>
            <p>
              {t('passageCertificate.endHelp', {
                defaultValue: 'Fin enregistrée du passage dans le système.',
              })}
            </p>
          </div>
        </div>
      </section>

      <section className="attestation-purpose">
        <h2>{t('passageCertificate.purpose', { defaultValue: 'OBJET DE L’ATTESTATION' })}</h2>
        <p>
          {t('passageCertificate.purposeOne', {
            site: site.siteName,
            defaultValue:
              'La présente attestation est délivrée à l’intéressé afin de justifier de son passage au sein de l’établissement {{site}}, à la date et aux horaires mentionnés dans le présent document.',
          })}
        </p>
        <p>
          {t('passageCertificate.purposeTwo', {
            defaultValue:
              'Elle est établie sur la base des informations enregistrées par le système DORIFY et peut être présentée à tout organisme ou tiers concerné, pour toute démarche nécessitant la justification de ce passage.',
          })}
        </p>
        <p>
          {t('passageCertificate.purposeThree', {
            defaultValue:
              'Cette attestation porte exclusivement sur les informations de passage enregistrées et ne préjuge pas de l’appréciation qui pourra en être faite par son destinataire.',
          })}
        </p>
      </section>

      <section className="attestation-stamp">
        <span>{t('passageReceipt.stamp')}</span>
      </section>

      <footer className="attestation-trace">
        <div>
          <span>
            {t('passageCertificate.generatedAt', {
              value: generated.format(generatedAt),
              defaultValue: 'Document généré le {{value}}',
            })}
          </span>
          <span>
            {t('passageCertificate.reference', {
              value: reference,
              defaultValue: 'Référence du document : {{value}}',
            })}
          </span>
        </div>
        <p>
          {t('passageCertificate.disclaimer', {
            defaultValue:
              'Ce document ne constitue ni une pièce d’identité ni un justificatif de paiement. Il atteste uniquement des événements de passage enregistrés par le système, sans certifier à lui seul une présence continue dans l’établissement.',
          })}
        </p>
      </footer>
    </article>,
    document.body,
  );
}
