import { printDocument } from './print-document';

/** One page sized to the selected roll width and the actual ticket height. */
export function printThermalTicket(widthMm: 58 | 80): () => void {
  const ticket = document.querySelector<HTMLElement>('.kiosk-ticket-print-document');
  if (!ticket) return () => undefined;
  const previousWidth = document.body.style.getPropertyValue('--ticket-paper-width');
  document.body.style.setProperty('--ticket-paper-width', String(widthMm) + 'mm');
  document.body.dataset.printKioskTicket = 'true';
  const heightMm = Math.ceil((ticket.getBoundingClientRect().height * 25.4) / 96) + 2;
  const page = document.createElement('style');
  page.dataset.thermalPage = 'true';
  page.textContent =
    '@page dorify-ticket { size: ' +
    String(widthMm) +
    'mm ' +
    String(heightMm) +
    'mm; margin: 0; }';
  document.head.append(page);
  const cleanup = () => {
    page.remove();
    if (previousWidth) document.body.style.setProperty('--ticket-paper-width', previousWidth);
    else document.body.style.removeProperty('--ticket-paper-width');
  };
  try {
    const stop = printDocument({ datasetKey: 'printKioskTicket', onAfterPrint: cleanup });
    return () => {
      stop();
      cleanup();
    };
  } catch (error) {
    delete document.body.dataset.printKioskTicket;
    cleanup();
    throw error;
  }
}
