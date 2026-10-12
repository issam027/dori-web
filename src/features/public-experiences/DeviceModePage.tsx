import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ClipboardPenLine, Monitor } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { clearSession } from '@/core/auth/session-actions';
import { ThemeSwitcher } from '@/design-system/components/ThemeSwitcher';

export function DeviceModePage() {
  const { t: __t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [disconnecting, setDisconnecting] = useState(false);

  return (
    <section className="device-mode-page" aria-labelledby="device-mode-title">
      <div className="device-mode-heading">
        <div className="device-mode-theme">
          <ThemeSwitcher />
        </div>
        <p className="eyebrow">{__t('public-experiences.deviceMode.configurationDeLAppareil')}</p>
        <h1 id="device-mode-title">
          {__t('public-experiences.deviceMode.quelEcranSouhaitezVousAfficher')}
        </h1>
        <p>{__t('public-experiences.deviceMode.choisissezLUsageDeCetAppareilVousPourrez')}</p>
      </div>
      <div className="device-mode-grid">
        <Link className="device-mode-card" to="/kiosk">
          <span className="device-mode-icon" aria-hidden="true">
            <ClipboardPenLine />
          </span>
          <span>
            <strong>{__t('public-experiences.deviceMode.borneDAccueil')}</strong>
            <small>{__t('deviceMode.kioskDescription')}</small>
          </span>
          <b>{__t('public-experiences.deviceMode.ouvrirLaBorne')}</b>
        </Link>
        <Link className="device-mode-card" to="/display">
          <span className="device-mode-icon" aria-hidden="true">
            <Monitor />
          </span>
          <span>
            <strong>{__t('public-experiences.deviceMode.ecranDeSalle')}</strong>
            <small>{__t('deviceMode.displayDescription')}</small>
          </span>
          <b>{__t('public-experiences.deviceMode.ouvrirLEcranSalle')}</b>
        </Link>
      </div>
      <div className="device-mode-footer">
        <p className="device-mode-hint">{__t('deviceMode.fullscreenTip')}</p>
        <button
          className="button"
          type="button"
          disabled={disconnecting}
          onClick={() => {
            setDisconnecting(true);
            void clearSession(queryClient).finally(() => {
              void navigate('/login', { replace: true });
            });
          }}
        >
          {disconnecting
            ? __t('public-experiences.deviceMode.deconnexion')
            : __t('public-experiences.deviceMode.deconnecterCetAppareil')}
        </button>
      </div>
    </section>
  );
}
