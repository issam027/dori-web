import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ClipboardPenLine, Monitor } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { clearSession } from '@/core/auth/session-actions';

export function DeviceModePage() {
  const { t: __t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [disconnecting, setDisconnecting] = useState(false);

  return (
    <section className="device-mode-page" aria-labelledby="device-mode-title">
      <div className="device-mode-heading">
        <p className="eyebrow">
          {__t('ui.public-experiences.device_mode_page.configuration_de_l_appareil_12mejpd')}
        </p>
        <h1 id="device-mode-title">
          {__t('ui.public-experiences.device_mode_page.quel_ecran_souhaitez_vous_afficher_14by7b0')}
        </h1>
        <p>
          {__t(
            'ui.public-experiences.device_mode_page.choisissez_l_usage_de_cet_appareil_vous_pourrez__1pnwjqi',
          )}
        </p>
      </div>
      <div className="device-mode-grid">
        <Link className="device-mode-card" to="/kiosk">
          <span className="device-mode-icon" aria-hidden="true">
            <ClipboardPenLine />
          </span>
          <span>
            <strong>{__t('ui.public-experiences.device_mode_page.borne_d_accueil_1arxoay')}</strong>
            <small>
              {__t(
                'ui.public-experiences.device_mode_page.inscription_des_nouveaux_arrivants_et_creation_d_1mwarob',
              )}
            </small>
          </span>
          <b>{__t('ui.public-experiences.device_mode_page.ouvrir_la_borne_1wgp2br')}</b>
        </Link>
        <Link className="device-mode-card" to="/display">
          <span className="device-mode-icon" aria-hidden="true">
            <Monitor />
          </span>
          <span>
            <strong>{__t('ui.public-experiences.device_mode_page.ecran_de_salle_17zgbb2')}</strong>
            <small>
              {__t(
                'ui.public-experiences.device_mode_page.affichage_des_tickets_appeles_des_guichets_et_de_vgf37r',
              )}
            </small>
          </span>
          <b>{__t('ui.public-experiences.device_mode_page.ouvrir_l_ecran_salle_h692bd')}</b>
        </Link>
      </div>
      <div className="device-mode-footer">
        <p className="device-mode-hint">
          {__t(
            'ui.public-experiences.device_mode_page.conseil_utilisez_le_mode_plein_ecran_du_navigate_nja46p',
          )}
        </p>
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
            ? __t('ui.expression.public-experiences.device_mode_page.deconnexion_vv1fmt')
            : __t(
                'ui.expression.public-experiences.device_mode_page.deconnecter_cet_appareil_1hklwq3',
              )}
        </button>
      </div>
    </section>
  );
}
