import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Printer } from 'lucide-react';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import type { PassageSummary } from '../operation-store';
import { PassagePrintDocument } from '../PassagePrintDocument';

export function DeskPassages({
  passages,
  siteName,
}: {
  passages: readonly PassageSummary[];
  siteName?: string;
}) {
  const { t } = useTranslation();
  const [printingId, setPrintingId] = useState<number | null>(null);
  const printingPassage = passages.find((passage) => passage.registrationId === printingId);

  useEffect(() => {
    if (!printingPassage) return;
    document.body.dataset.printPassage = String(printingPassage.registrationId);
    const finish = () => {
      delete document.body.dataset.printPassage;
      setPrintingId(null);
    };
    window.addEventListener('afterprint', finish, { once: true });
    const timer = window.setTimeout(() => {
      window.print();
    }, 50);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', finish);
      delete document.body.dataset.printPassage;
    };
  }, [printingPassage]);

  if (passages.length === 0) return null;
  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
  const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
  return (
    <section className="passage-summary" aria-labelledby="passage-summary-title">
      <div className="passage-summary-heading">
        <div>
          <span className="eyebrow">{t('queue-operations.desk.sessionEnCours')}</span>
          <h2 id="passage-summary-title">{t('queue-operations.desk.recapitulatifDesPassages')}</h2>
        </div>
        <StatusBadge tone="neutral">
          {passages.length} {t('queue-operations.desk.passageS')}
        </StatusBadge>
      </div>
      <div className="passage-summary-grid">
        {passages.map((passage) => (
          <article
            className="passage-summary-card"
            key={`${String(passage.registrationId)}-${passage.closedAt}`}
          >
            <header>
              <div>
                <small>
                  {passage.ticketNumber} {t('common.guichetLabel')}
                  {passage.threadNumber}
                </small>
                <h3>{passage.personName}</h3>
              </div>
              <StatusBadge tone={passage.outcome === 'served' ? 'success' : 'neutral'}>
                {passage.outcome === 'served' ? t('common.servi') : t('common.absent')}
              </StatusBadge>
            </header>
            <div className="passage-print-header" aria-hidden="true">
              <strong>{t('queue-operations.desk.doriJustificatifDePassage')}</strong>
              <span>
                {t('queue-operations.desk.imprimeLe')}{' '}
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'long',
                  timeStyle: 'short',
                }).format(new Date())}
              </span>
            </div>
            <dl>
              <div>
                <dt>{t('queue-operations.desk.dateDArrivee')}</dt>
                <dd>
                  {passage.arrivedAt ? dateFormatter.format(new Date(passage.arrivedAt)) : '—'}
                </dd>
              </div>
              <div>
                <dt>{t('queue-operations.desk.arrivee')}</dt>
                <dd>
                  {passage.arrivedAt ? timeFormatter.format(new Date(passage.arrivedAt)) : '—'}
                </dd>
              </div>
              <div>
                <dt>{t('queue-operations.desk.appel')}</dt>
                <dd>{timeFormatter.format(new Date(passage.calledAt))}</dd>
              </div>
              <div>
                <dt>{t('queue-operations.desk.sortie')}</dt>
                <dd>{timeFormatter.format(new Date(passage.closedAt))}</dd>
              </div>
            </dl>
            <footer>
              <small>{t('queue-operations.desk.justificatifDePassageDoriDocumentNonFiscal')}</small>
              <button
                className="button print-hidden"
                type="button"
                disabled={!siteName}
                onClick={() => {
                  setPrintingId(passage.registrationId);
                }}
              >
                <Printer aria-hidden="true" />
                {t('queue-operations.desk.imprimerLeJustificatif')}
              </button>
            </footer>
            <div className="passage-print-legal" aria-hidden="true">
              <p>{t('queue-operations.desk.ceJustificatifEstImprimeALaDemandeDuClie')}</p>
              <div>
                <span>{t('queue-operations.desk.signatureCachetDeLEtablissement')}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
      {printingPassage && siteName ? (
        <PassagePrintDocument passage={printingPassage} siteName={siteName} />
      ) : null}
    </section>
  );
}
