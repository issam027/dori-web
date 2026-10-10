import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { PassageSummary } from './operation-store';

export function PassagePrintDocument({
  passage,
  siteName,
}: {
  passage: PassageSummary;
  siteName: string;
}) {
  const { t } = useTranslation();
  const arrivedAt = passage.arrivedAt ? new Date(passage.arrivedAt) : null;
  const passageDate = arrivedAt ?? new Date(passage.calledAt);
  const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' });
  const time = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

  return createPortal(
    <article className="passage-print-document" aria-hidden="true">
      <header>
        <div>
          <strong>{t('app.name')}</strong>
          <span>{t('passageReceipt.subtitle')}</span>
        </div>
        <small>
          {t('passageReceipt.printedAt', {
            value: new Intl.DateTimeFormat(undefined, {
              dateStyle: 'long',
              timeStyle: 'short',
            }).format(new Date()),
          })}
        </small>
      </header>
      <h1>{t('passageReceipt.title')}</h1>
      <p className="passage-print-statement">
        {t('passageReceipt.statement', {
          name: passage.personName,
          site: siteName,
          date: date.format(passageDate),
          arrival: arrivedAt ? time.format(arrivedAt) : t('passageReceipt.notRecorded'),
          call: time.format(new Date(passage.calledAt)),
          departure: time.format(new Date(passage.closedAt)),
        })}
      </p>
      <dl>
        <div>
          <dt>{t('passageReceipt.site')}</dt>
          <dd>{siteName}</dd>
        </div>
        <div>
          <dt>{t('passageReceipt.person')}</dt>
          <dd>{passage.personName}</dd>
        </div>
        <div>
          <dt>{t('passageReceipt.ticket')}</dt>
          <dd>{passage.ticketNumber}</dd>
        </div>
        <div>
          <dt>{t('passageReceipt.date')}</dt>
          <dd>{date.format(passageDate)}</dd>
        </div>
        <div>
          <dt>{t('passageReceipt.desk')}</dt>
          <dd>{passage.threadNumber}</dd>
        </div>
        <div>
          <dt>{t('passageReceipt.arrival')}</dt>
          <dd>{arrivedAt ? time.format(arrivedAt) : t('passageReceipt.notRecorded')}</dd>
        </div>
        <div>
          <dt>{t('passageReceipt.call')}</dt>
          <dd>{time.format(new Date(passage.calledAt))}</dd>
        </div>
        <div>
          <dt>{t('passageReceipt.departure')}</dt>
          <dd>{time.format(new Date(passage.closedAt))}</dd>
        </div>
        <div>
          <dt>{t('passageReceipt.outcome')}</dt>
          <dd>
            {passage.outcome === 'served' ? t('passageReceipt.served') : t('passageReceipt.noShow')}
          </dd>
        </div>
      </dl>
      <p className="passage-print-disclaimer">{t('passageReceipt.disclaimer')}</p>
      <footer>
        <div>
          <span>{t('passageReceipt.signature')}</span>
        </div>
        <div>
          <span>{t('passageReceipt.stamp')}</span>
        </div>
      </footer>
    </article>,
    document.body,
  );
}
