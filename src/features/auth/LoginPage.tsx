import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { getRememberedUsername, login } from '@/core/auth/session-actions';
import { useSessionStore } from '@/core/auth/session-store';
import { findFirstAuthorizedPath } from '@/core/permissions/route-access';
import { FormField } from '@/design-system/components/FormField';

const createSchema = (t: TFunction) => z.object({
  username: z.string().trim().min(1, t('validation.usernameRequired')),
  password: z.string().min(1, t('validation.passwordRequired')),
  rememberUsername: z.boolean(),
});
type LoginForm = z.infer<ReturnType<typeof createSchema>>;

const demoProfiles = [
  { username: 'root', labelKey: 'demo.root', icon: '◆', detailKey: 'demo.rootDetail' },
  { username: 'admin', labelKey: 'demo.admin', icon: '⚙', detailKey: 'demo.adminDetail' },
  { username: 'manager', labelKey: 'demo.manager', icon: '◉', detailKey: 'demo.managerDetail' },
  { username: 'operator', labelKey: 'demo.operator', icon: '▣', detailKey: 'demo.operatorDetail' },
  { username: 'kiosk', labelKey: 'demo.kiosk', icon: '▰', detailKey: 'demo.kioskDetail' },
] as const;
const demoPassword = 'Root@123456';

export function LoginPage() {
  const { t: __t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [apiError, setApiError] = useState('');
  const [quickProfile, setQuickProfile] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(createSchema(__t)),
    defaultValues: {
      username: getRememberedUsername(),
      password: '',
      rememberUsername: Boolean(getRememberedUsername()),
    },
  });

  if (user)
    return (
      <Navigate
        replace
        to={user.mustChangePassword ? '/change-password' : findFirstAuthorizedPath(user)}
      />
    );

  const authenticate = async (values: LoginForm) => {
    setApiError('');
    try {
      await login(
        { username: values.username, password: values.password },
        values.rememberUsername,
      );
      const current = useSessionStore.getState().user;
      const requested = (location.state as { from?: string } | null)?.from;
      if (current)
        void navigate(
          current.mustChangePassword
            ? '/change-password'
            : current.userType === 'kiosk'
              ? '/device-mode'
              : (requested ?? findFirstAuthorizedPath(current)),
          { replace: true },
        );
    } catch {
      setApiError(
        __t('ui.expression.auth.login_page.identifiant_ou_mot_de_passe_incorrect_qunbv0'),
      );
    } finally {
      setQuickProfile(null);
    }
  };
  const submit = handleSubmit(authenticate);

  return (
    <section className="auth-card" aria-labelledby="login-title">
      <div className="login-brand">
        <span className="brand-mark">{__t('ui.auth.login_page.d_1hkaexf')}</span>
        <span>
          <strong>{__t('ui.auth.login_page.dori_9y7skh')}</strong>
          <small>{__t('ui.auth.login_page.plateforme_de_gestion_des_flux_cy6z8f')}</small>
        </span>
      </div>
      <div className="login-grid">
        <div className="login-form-panel">
          <p className="eyebrow">{__t('ui.auth.login_page.connexion_securisee_8ak5sk')}</p>
          <h1 id="login-title">{__t('ui.auth.login_page.bienvenue_sur_votre_espace_z9natn')}</h1>
          <p>{__t('ui.auth.login_page.connectez_vous_avec_votre_identifiant_dori_xe5h0m')}</p>
          <form
            className="form-stack"
            onSubmit={(event) => {
              void submit(event);
            }}
          >
            <FormField
              label={__t('ui.auth.login_page.email_ou_nom_utilisateur_18xczuw')}
              required
              error={errors.username?.message}
            >
              <input autoComplete="username" {...register('username')} />
            </FormField>
            <FormField
              label={__t('ui.auth.login_page.mot_de_passe_15gpn9e')}
              required
              error={errors.password?.message}
            >
              <input type="password" autoComplete="current-password" {...register('password')} />
            </FormField>
            <label className="check-row">
              <input type="checkbox" {...register('rememberUsername')} />{' '}
              {__t('ui.auth.login_page.memoriser_mon_identifiant_4tfz4b')}
            </label>
            <button type="button" className="text-button" disabled>
              {__t('ui.auth.login_page.mot_de_passe_oublie_sc5mxu')}
            </button>
            {apiError ? (
              <p className="field-error" role="alert">
                {apiError}
              </p>
            ) : null}
            <button className="button button-primary" disabled={isSubmitting} type="submit">
              {isSubmitting
                ? __t('ui.expression.auth.login_page.connexion_6397u6')
                : __t('ui.expression.auth.login_page.se_connecter_1u4l9ls')}
            </button>
          </form>
        </div>
        {import.meta.env.DEV ? (
          <aside className="quick-login" aria-labelledby="quick-login-title">
            <div>
              <p className="eyebrow">{__t('ui.auth.login_page.mode_demonstration_17pdpyl')}</p>
              <h2 id="quick-login-title">{__t('ui.auth.login_page.connexion_rapide_1wyr4bt')}</h2>
              <p>
                {__t('ui.auth.login_page.chaque_profil_utilise_le_parcours_normal_de_l_ap_17kz34e')}
              </p>
            </div>
            <div className="quick-login-grid">
              {demoProfiles.map((profile) => (
                <button
                  key={profile.username}
                  className="button quick-login-button"
                  type="button"
                  disabled={isSubmitting || quickProfile !== null}
                  onClick={() => {
                    setQuickProfile(profile.username);
                    void authenticate({
                      username: profile.username,
                      password: demoPassword,
                      rememberUsername: false,
                    });
                  }}
                >
                  <span className="quick-login-icon" aria-hidden="true">
                    {profile.icon}
                  </span>
                  <strong>{__t(profile.labelKey)}</strong>
                  <span>{__t(profile.detailKey)}</span>
                  <small>@{profile.username}</small>
                  {quickProfile === profile.username ? (
                    <small>{__t('ui.auth.login_page.connexion_1a0ztte')}</small>
                  ) : null}
                </button>
              ))}
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
