import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { TrackingQr } from '../../TrackingQr';
import { formatDateTime } from '@/core/i18n/date-format';

export function KioskTicketPrintDocument({
  ticketNumber,
  siteName,
  queueName,
  trackingUrl,
  onReady,
}: {
  ticketNumber: string;
  siteName?: string;
  queueName?: string;
  trackingUrl?: string | null;
  onReady: () => void;
}) {
  const { t, i18n } = useTranslation();

  return createPortal(
    <article className="kiosk-ticket-print-document" aria-hidden="true">
      <header>
        <strong>{siteName || t('app.name')}</strong>
      </header>
      <main>
        <small>{t('kiosk.ticket.numberHeading')}</small>
        <h1>{ticketNumber}</h1>
        {queueName ? <p className="kiosk-print-queue">{queueName}</p> : null}
        <TrackingQr value={trackingUrl} onReady={onReady} />
        <p>{t('kiosk.print.guidance')}</p>
      </main>
      <footer>
        <span>
          {t('kiosk.print.printedAt', {
            date: formatDateTime(new Date(), i18n.language) ?? '—',
          })}
        </span>
        <small>{t('kiosk.print.footer')}</small>
      </footer>
    </article>,
    document.body,
  );
}
