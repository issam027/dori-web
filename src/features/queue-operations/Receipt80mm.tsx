import { useTranslation } from 'react-i18next';
import { Printer } from 'lucide-react';
import type { CallNextRegistrationResponseDto } from '@/api/generated/models';
import { Button } from '@/design-system/components/Button';

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
      <h2>{__t('app.name')}</h2>
      <p>{__t('queue-operations.receipt80mm.recapitulatifDePassage')}</p>
      <strong>{call.ticketNumber}</strong>
      <dl>
        <div>
          <dt>{__t('common.guichet')}</dt>
          <dd>{call.threadNumber}</dd>
        </div>
        <div>
          <dt>{__t('queue-operations.receipt80mm.heureDAppel')}</dt>
          <dd>{new Date(call.calledAt).toLocaleTimeString()}</dd>
        </div>
        <div>
          <dt>{__t('queue-operations.receipt80mm.resultat')}</dt>
          <dd>{outcome === 'served' ? __t('common.servi') : __t('common.absent')}</dd>
        </div>
      </dl>
      <small>{__t('queue-operations.receipt80mm.documentNonFiscalDonneesConfirmeesParLeSe')}</small>
      <Button variant="unstyled"
        className="button print-hidden"
        type="button"
        onClick={() => {
          window.print();
        }}
      >
        <Printer aria-hidden="true" />
        {__t('queue-operations.receipt80mm.imprimer')}
      </Button>
    </article>
  );
}
