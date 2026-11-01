
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { TrackingQr } from '../../TrackingQr';
import { KioskTicketResult } from './KioskSteps';
import { KioskTicketPrintDocument } from './KioskTicketPrintDocument';
import { Button } from '@/design-system/components/Button';
import { printDocument } from '@/shared/printing/print-document';
export function KioskSuccess({ result, siteName, printReady, onReady, onDone }: {
result: { ticketNumber: string; trackingUrl: string | null; queueName?: string };
siteName?: string; printReady: boolean; onReady: () => void; onDone: () => void;
}) {
const { t: __t } = useTranslation();
return (<KioskTicketResult>
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
            <Button
              variant="unstyled"
              type="button"
              disabled={!printReady}
              onClick={() => {
                printDocument({ datasetKey: 'printKioskTicket' });
              }}
            >
              {__t('public-experiences.kiosk.imprimerMonTicket')}
            </Button>
            <Button variant="primary" type="button" onClick={onDone}>
              {__t('common.terminer')}
            </Button>
          </div>
          <KioskTicketPrintDocument
            ticketNumber={result.ticketNumber}
            siteName={siteName}
            queueName={result.queueName}
            trackingUrl={result.trackingUrl}
            onReady={onReady}
          />
        </KioskTicketResult>);
}
