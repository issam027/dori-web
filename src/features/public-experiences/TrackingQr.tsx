import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function TrackingQr({ onReady }: { value?: string | null; onReady?: () => void }) {
  const { t: __t } = useTranslation();
  const appName = __t('app.name');
  const qrValue = __t('tracking.qr.testMessage');
  const [source, setSource] = useState('');
  useEffect(() => {
    let active = true;
    void QRCode.toString(qrValue, {
      type: 'svg',
      margin: 1,
      width: 220,
      errorCorrectionLevel: 'H',
      color: { dark: '#000000', light: '#ffffff' },
    }).then((svg) => {
      if (active) {
        setSource(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
        onReady?.();
      }
    });
    return () => {
      active = false;
    };
  }, [onReady, qrValue]);
  if (!source) return null;
  return (
    <figure className="tracking-qr">
      <span className="tracking-qr-code">
        <img className="tracking-qr-image" src={source} aria-label={__t('tracking.qr.testLabel')} />
        <span className="tracking-qr-logo" aria-hidden="true">
          <b>{appName.slice(0, 3)}</b>
          <b>{appName.slice(3)}</b>
        </span>
      </span>
      <figcaption>{__t('public-experiences.trackingQr.scannezPourSuivreVotrePosition')}</figcaption>
    </figure>
  );
}
