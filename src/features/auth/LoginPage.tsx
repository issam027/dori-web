import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { getRememberedUsername, login } from '@/core/auth/session-actions';
import { useSessionStore } from '@/core/auth/session-store';
import { findFirstAuthorizedPath } from '@/core/permissions/route-access';
import { FormField } from '@/design-system/components/FormField';

const schema = z.object({
  username: z.string().trim().min(1, 'Identifiant requis'),
  password: z.string().min(1, 'Mot de passe requis'),
  rememberUsername: z.boolean(),
});
type LoginForm = z.infer<typeof schema>;

const demoProfiles = [
  { username: 'root', label: 'Root', icon: '◆', detail: 'Toute la plateforme' },
  { username: 'admin', label: 'Admin', icon: '⚙', detail: 'Configuration' },
  { username: 'manager', label: 'Manager', icon: '◉', detail: 'Supervision' },
  { username: 'operator', label: 'Hotesse', icon: '▣', detail: 'Guichet & files' },
  { username: 'kiosk', label: 'Kiosque', icon: '▰', detail: 'Borne & ecran' },
] as const;
const demoPassword = 'Root@123456';

export function LoginPage() {
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
    resolver: zodResolver(schema),
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
            : (requested ?? findFirstAuthorizedPath(current)),
          { replace: true },
        );
    } catch {
      setApiError('Identifiant ou mot de passe incorrect.');
    } finally {
      setQuickProfile(null);
    }
  };
  const submit = handleSubmit(authenticate);

  return (
    <section className="auth-card" aria-labelledby="login-title">
      <div className="login-brand">
        <span className="brand-mark">D</span>
        <span>
          <strong>DORI</strong>
          <small>Plateforme de gestion des flux</small>
        </span>
      </div>
      <div className="login-grid">
        <div className="login-form-panel">
          <p className="eyebrow">Connexion securisee</p>
          <h1 id="login-title">Bienvenue sur votre espace</h1>
          <p>Connectez-vous avec votre identifiant DORI.</p>
          <form
            className="form-stack"
            onSubmit={(event) => {
              void submit(event);
            }}
          >
            <FormField label="Email ou nom utilisateur" required error={errors.username?.message}>
              <input autoComplete="username" {...register('username')} />
            </FormField>
            <FormField label="Mot de passe" required error={errors.password?.message}>
              <input type="password" autoComplete="current-password" {...register('password')} />
            </FormField>
            <label className="check-row">
              <input type="checkbox" {...register('rememberUsername')} /> Mémoriser mon identifiant
            </label>
            <button type="button" className="text-button" disabled>
              Mot de passe oublié
            </button>
            {apiError ? (
              <p className="field-error" role="alert">
                {apiError}
              </p>
            ) : null}
            <button className="button button-primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
        {import.meta.env.DEV ? (
          <aside className="quick-login" aria-labelledby="quick-login-title">
            <div>
              <p className="eyebrow">Mode demonstration</p>
              <h2 id="quick-login-title">Connexion rapide</h2>
              <p>Chaque profil utilise le parcours normal de l'API.</p>
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
                  <strong>{profile.label}</strong>
                  <span>{profile.detail}</span>
                  <small>@{profile.username}</small>
                  {quickProfile === profile.username ? <small>Connexion...</small> : null}
                </button>
              ))}
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
