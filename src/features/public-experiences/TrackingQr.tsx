import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function TrackingQr({ value, onReady }: { value?: string | null; onReady?: () => void }) {
  if (!value) return null;
  return <GeneratedQr value={value} onReady={onReady} />;
}

function GeneratedQr({ value, onReady }: { value: string; onReady?: () => void }) {
  const { t: __t } = useTranslation();
  const [source, setSource] = useState('');
  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(value, { margin: 1, width: 220, errorCorrectionLevel: 'M' }).then(
      (url) => {
        if (active) {
          setSource(url);
          onReady?.();
        }
      },
    );
    return () => {
      active = false;
    };
  }, [onReady, value]);
  if (!source) return null;
  return (
    <figure className="tracking-qr">
      <img src={source} alt="QR code de suivi du ticket" />
      <figcaption>
        {__t('ui.public-experiences.tracking_qr.scannez_pour_suivre_votre_position_fk8hq8')}
      </figcaption>
    </figure>
  );
}
