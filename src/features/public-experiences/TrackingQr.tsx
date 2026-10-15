import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function TrackingQr({ value, onReady }: { value?: string | null; onReady?: () => void }) {
  const { t: __t } = useTranslation();
  const appName = __t('app.name');
  const qrValue = value?.trim() ?? '';
  const [generated, setGenerated] = useState({ value: '', source: '' });
  useEffect(() => {
    let active = true;
    if (!qrValue) {
      queueMicrotask(() => { if (active) onReady?.(); });
      return () => { active = false; };
    }
    void QRCode.toString(qrValue, {
      type: 'svg',
      margin: 1,
      width: 220,
      errorCorrectionLevel: 'H',
      color: { dark: '#000000', light: '#ffffff' },
    }).then((svg) => {
      if (active) {
        setGenerated({ value: qrValue, source: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` });
        onReady?.();
      }
    });
    return () => {
      active = false;
    };
  }, [onReady, qrValue]);
  const source = generated.value === qrValue ? generated.source : '';
  if (!source) return null;
  return (
    <figure className="tracking-qr">
      <span className="tracking-qr-code">
        <img className="tracking-qr-image" src={source} alt={__t('tracking.qr.label')} />
        <span className="tracking-qr-logo" aria-hidden="true">
          <b>{appName.slice(0, 3)}</b>
          <b>{appName.slice(3)}</b>
        </span>
      </span>
      <figcaption>{__t('public-experiences.trackingQr.scannezPourSuivreVotrePosition')}</figcaption>
    </figure>
  );
}
