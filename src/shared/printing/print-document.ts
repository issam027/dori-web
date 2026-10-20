export interface PrintDocumentOptions {
  datasetKey: string;
  datasetValue?: string;
  delayMs?: number;
  cleanupAfterMs?: number;
  onAfterPrint?: () => void;
}

export function printDocument({
  datasetKey,
  datasetValue = 'true',
  delayMs = 0,
  cleanupAfterMs = 30_000,
  onAfterPrint,
}: PrintDocumentOptions): () => void {
  const dataAttribute = `data-${datasetKey.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
  document.body.setAttribute(dataAttribute, datasetValue);
  let printTimer: number | undefined;
  let active = true;

  const cleanup = () => {
    if (!active) return;
    active = false;
    if (printTimer !== undefined) window.clearTimeout(printTimer);
    window.clearTimeout(cleanupTimer);
    window.removeEventListener('afterprint', finish);
    document.body.removeAttribute(dataAttribute);
  };
  const finish = () => {
    if (!active) return;
    cleanup();
    onAfterPrint?.();
  };
  const start = () => {
    if (active) window.print();
  };

  window.addEventListener('afterprint', finish, { once: true });
  const cleanupTimer = window.setTimeout(finish, cleanupAfterMs);
  if (delayMs > 0) printTimer = window.setTimeout(start, delayMs);
  else start();

  return cleanup;
}
