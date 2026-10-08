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

export function LoginPage() {
  const user = useSessionStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [apiError, setApiError] = useState('');
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

  const submit = handleSubmit(async (values) => {
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
    }
  });

  return (
    <section className="auth-card" aria-labelledby="login-title">
      <p className="eyebrow">DORI</p>
      <h1 id="login-title">Connexion</h1>
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
    </section>
  );
}
