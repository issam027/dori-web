import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { TrackingQr } from '../../TrackingQr';
import { KioskTicketResult } from './KioskSteps';
import { KioskTicketPrintDocument } from './KioskTicketPrintDocument';
import { Button } from '@/design-system/components/Button';
import { printThermalTicket } from '@/shared/printing/print-thermal-ticket';
import { usePreferencesStore } from '@/core/theme/preferences-store';
export function KioskSuccess({
  result,
  siteName,
  printReady,
  onReady,
  onDone,
}: {
  result: { ticketNumber: string; trackingUrl: string | null; queueName?: string };
  siteName?: string;
  printReady: boolean;
  onReady: () => void;
  onDone: () => void;
}) {
  const { t: __t } = useTranslation();
  const paperWidth = usePreferencesStore((state) => state.ticketPaperWidthMm);
  const setPaperWidth = usePreferencesStore((state) => state.setTicketPaperWidthMm);
  return (
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
        <label>
          {__t('kiosk.print.paperWidth')}
          <select
            value={paperWidth}
            onChange={(event) => {
              setPaperWidth(event.target.value === '80' ? 80 : 58);
            }}
          >
            <option value="58">{__t('kiosk.print.paperSize', { width: 58 })}</option>
            <option value="80">{__t('kiosk.print.paperSize', { width: 80 })}</option>
          </select>
        </label>
        <Button
          variant="unstyled"
          type="button"
          disabled={!printReady}
          onClick={() => {
            printThermalTicket(paperWidth);
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
    </KioskTicketResult>
  );
}
