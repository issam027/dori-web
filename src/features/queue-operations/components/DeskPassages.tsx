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
          <span className="eyebrow">
            {t('ui.queue-operations.desk_page.session_en_cours_1tmgxtg')}
          </span>
          <h2 id="passage-summary-title">
            {t('ui.queue-operations.desk_page.recapitulatif_des_passages_d3ru2n')}
          </h2>
        </div>
        <StatusBadge tone="neutral">
          {passages.length} {t('ui.queue-operations.desk_page.passage_s_1rhvk1p')}
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
                  {passage.ticketNumber} {t('ui.queue-operations.desk_page.guichet_gvzfu7')}
                  {passage.threadNumber}
                </small>
                <h3>{passage.personName}</h3>
              </div>
              <StatusBadge tone={passage.outcome === 'served' ? 'success' : 'neutral'}>
                {passage.outcome === 'served'
                  ? t('ui.expression.queue-operations.desk_page.servi_1bextlc')
                  : t('ui.expression.queue-operations.desk_page.absent_meu720')}
              </StatusBadge>
            </header>
            <div className="passage-print-header" aria-hidden="true">
              <strong>
                {t('ui.queue-operations.desk_page.dori_justificatif_de_passage_13e6u9q')}
              </strong>
              <span>
                {t('ui.queue-operations.desk_page.imprime_le_wx6ut5')}{' '}
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'long',
                  timeStyle: 'short',
                }).format(new Date())}
              </span>
            </div>
            <dl>
              <div>
                <dt>{t('ui.queue-operations.desk_page.date_d_arrivee_zmki1y')}</dt>
                <dd>
                  {passage.arrivedAt ? dateFormatter.format(new Date(passage.arrivedAt)) : '—'}
                </dd>
              </div>
              <div>
                <dt>{t('ui.queue-operations.desk_page.arrivee_8ef051')}</dt>
                <dd>
                  {passage.arrivedAt ? timeFormatter.format(new Date(passage.arrivedAt)) : '—'}
                </dd>
              </div>
              <div>
                <dt>{t('ui.queue-operations.desk_page.appel_1i9dqud')}</dt>
                <dd>{timeFormatter.format(new Date(passage.calledAt))}</dd>
              </div>
              <div>
                <dt>{t('ui.queue-operations.desk_page.sortie_1j61eqf')}</dt>
                <dd>{timeFormatter.format(new Date(passage.closedAt))}</dd>
              </div>
            </dl>
            <footer>
              <small>
                {t(
                  'ui.queue-operations.desk_page.justificatif_de_passage_dori_document_non_fiscal_1knp9yu',
                )}
              </small>
              <button
                className="button print-hidden"
                type="button"
                disabled={!siteName}
                onClick={() => {
                  setPrintingId(passage.registrationId);
                }}
              >
                <Printer aria-hidden="true" />
                {t('ui.queue-operations.desk_page.imprimer_le_justificatif_3rhfqy')}
              </button>
            </footer>
            <div className="passage-print-legal" aria-hidden="true">
              <p>
                {t(
                  'ui.queue-operations.desk_page.ce_justificatif_est_imprime_a_la_demande_du_clie_16a2ra6',
                )}
              </p>
              <div>
                <span>
                  {t('ui.queue-operations.desk_page.signature_cachet_de_l_etablissement_5o6gtm')}
                </span>
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
