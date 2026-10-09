import { useTranslation } from 'react-i18next';
import type { CallNextRegistrationResponseDto } from '@/api/generated/models';

export function Receipt80mm({
  call,
  outcome,
}: {
  call: CallNextRegistrationResponseDto;
  outcome: 'served' | 'no_show';
}) {
  const { t: __t } = useTranslation();
  return (
    <article className="receipt-80mm">
      <h2>{__t('ui.queue-operations.receipt80mm.dori_9y7skh')}</h2>
      <p>{__t('ui.queue-operations.receipt80mm.recapitulatif_de_passage_8g2a11')}</p>
      <strong>{call.ticketNumber}</strong>
      <dl>
        <div>
          <dt>{__t('ui.queue-operations.receipt80mm.guichet_15ztv8y')}</dt>
          <dd>{call.threadNumber}</dd>
        </div>
        <div>
          <dt>{__t('ui.queue-operations.receipt80mm.heure_d_appel_j17a5x')}</dt>
          <dd>{new Date(call.calledAt).toLocaleTimeString()}</dd>
        </div>
        <div>
          <dt>{__t('ui.queue-operations.receipt80mm.resultat_3anr1h')}</dt>
          <dd>
            {outcome === 'served'
              ? __t('ui.expression.queue-operations.receipt80mm.servi_1bextlc')
              : __t('ui.expression.queue-operations.receipt80mm.absent_meu720')}
          </dd>
        </div>
      </dl>
      <small>
        {__t(
          'ui.queue-operations.receipt80mm.document_non_fiscal_donnees_confirmees_par_le_se_evtkln',
        )}
      </small>
      <button
        className="button print-hidden"
        type="button"
        onClick={() => {
          window.print();
        }}
      >
        {__t('ui.queue-operations.receipt80mm.imprimer_gwyilo')}
      </button>
    </article>
  );
}
