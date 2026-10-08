import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { authControllerChangePassword } from '@/api/generated/authentification/authentification';
import { hydrateSession } from '@/core/auth/session-actions';
import { useSessionStore } from '@/core/auth/session-store';
import { findFirstAuthorizedPath } from '@/core/permissions/route-access';
import { Card } from '@/design-system/components/Card';
import { FormField } from '@/design-system/components/FormField';
import { PageHeader } from '@/design-system/components/PageHeader';

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(10).max(20),
    confirmation: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmation, {
    path: ['confirmation'],
    message: 'Les mots de passe diffèrent.',
  });
type FormValues = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const submit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setApiError('');
    try {
      await authControllerChangePassword({ currentPassword, newPassword });
      await hydrateSession();
      const user = useSessionStore.getState().user;
      if (user) void navigate(findFirstAuthorizedPath(user), { replace: true });
    } catch {
      setApiError('Le mot de passe n’a pas pu être modifié.');
    }
  });
  return (
    <div className="page-stack">
      <PageHeader
        title="Changer le mot de passe"
        description="Choisissez un mot de passe de 10 à 20 caractères."
      />
      <Card>
        <form
          className="form-stack"
          onSubmit={(e) => {
            void submit(e);
          }}
        >
          <FormField label="Mot de passe actuel" required>
            <input
              type="password"
              autoComplete="current-password"
              {...register('currentPassword')}
            />
          </FormField>
          <FormField
            label="Nouveau mot de passe"
            required
            error={errors.newPassword ? 'Entre 10 et 20 caractères.' : undefined}
          >
            <input type="password" autoComplete="new-password" {...register('newPassword')} />
          </FormField>
          <FormField label="Confirmation" required error={errors.confirmation?.message}>
            <input type="password" autoComplete="new-password" {...register('confirmation')} />
          </FormField>
          {apiError ? (
            <p role="alert" className="field-error">
              {apiError}
            </p>
          ) : null}
          <button className="button button-primary" disabled={isSubmitting} type="submit">
            Enregistrer
          </button>
        </form>
      </Card>
    </div>
  );
}
