import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { TrackingQr } from '../../TrackingQr';

export function KioskTicketPrintDocument({
  ticketNumber,
  queueName,
  trackingUrl,
  onReady,
}: {
  ticketNumber: string;
  queueName?: string;
  trackingUrl?: string | null;
  onReady: () => void;
}) {
  const { t } = useTranslation();

  return createPortal(
    <article className="kiosk-ticket-print-document" aria-hidden="true">
      <header>
        <strong>{t('app.name')}</strong>
        <span>{t('kiosk.print.title')}</span>
      </header>
      <main>
        <small>{t('kiosk.ticket.numberHeading')}</small>
        <h1>{ticketNumber}</h1>
        {queueName ? <p className="kiosk-print-queue">{queueName}</p> : null}
        <TrackingQr value={trackingUrl} onReady={onReady} />
        <p>{t('kiosk.print.guidance')}</p>
      </main>
      <footer>
        <span>{t('kiosk.print.printedAt', { date: new Date().toLocaleString() })}</span>
        <small>{t('kiosk.print.footer')}</small>
      </footer>
    </article>,
    document.body,
  );
}
