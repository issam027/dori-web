import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export const QR_TEST_MESSAGE = 'Bienvenue sur DORIFY';

export function TrackingQr({ onReady }: { value?: string | null; onReady?: () => void }) {
  const { t: __t } = useTranslation();
  const [source, setSource] = useState('');
  useEffect(() => {
    let active = true;
    void QRCode.toString(QR_TEST_MESSAGE, {
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
  }, [onReady]);
  if (!source) return null;
  return (
    <figure className="tracking-qr">
      <span className="tracking-qr-code">
        <img
          className="tracking-qr-image"
          src={source}
          aria-label={__t('tracking.qr.qrCodeDeTestDorify')}
        />
        <span className="tracking-qr-logo" aria-hidden="true">
          <b>DOR</b>
          <b>IFY</b>
        </span>
      </span>
      <figcaption>{__t('public-experiences.trackingQr.scannezPourSuivreVotrePosition')}</figcaption>
    </figure>
  );
}
