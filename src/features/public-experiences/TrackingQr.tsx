import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function TrackingQr({ value, onReady }: { value?: string | null; onReady?: () => void }) {
  const { t: __t, i18n } = useTranslation();
  const appName = __t('app.name');
  const isArabic = (i18n.resolvedLanguage ?? i18n.language).split('-')[0] === 'ar';
  const logoLines = isArabic ? ['دوري', 'فاي'] : [appName.slice(0, 3), appName.slice(3)];
  const qrValue = value?.trim() ?? '';
  const [generated, setGenerated] = useState({ value: '', source: '' });
  useEffect(() => {
    let active = true;
    if (!qrValue) {
      queueMicrotask(() => { if (active) onReady?.(); });
      return () => { active = false; };
    }
    void QRCode.toDataURL(qrValue, {
      margin: 1,
      width: 220,
      errorCorrectionLevel: 'H',
      color: { dark: '#000000', light: '#ffffff' },
    }).then((dataUrl) => {
      if (active) {
        setGenerated({ value: qrValue, source: dataUrl });
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
        <span
          className={`tracking-qr-logo${isArabic ? ' is-arabic' : ''}`}
          dir={isArabic ? 'rtl' : 'ltr'}
          aria-hidden="true"
        >
          <b>{logoLines[0]}</b>
          <b>{logoLines[1]}</b>
        </span>
      </span>
      <figcaption>{__t('public-experiences.trackingQr.scannezPourSuivreVotrePosition')}</figcaption>
    </figure>
  );
}
