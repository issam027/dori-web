import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import type { TFunction } from 'i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { changePassword } from './api/password-api';
import { hydrateSession } from '@/core/auth/session-actions';
import { useSessionStore } from '@/core/auth/session-store';
import { findFirstAuthorizedPath } from '@/core/permissions/route-access';
import { Card } from '@/design-system/components/Card';
import { FormField } from '@/design-system/components/FormField';
import { PageHeader } from '@/design-system/components/PageHeader';
import { Button } from '@/design-system/components/Button';

const createSchema = (t: TFunction) =>
  z
    .object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(10).max(20),
      confirmation: z.string(),
    })
    .refine((v) => v.newPassword === v.confirmation, {
      path: ['confirmation'],
      message: t('validation.passwordsDiffer'),
    });
type FormValues = z.infer<ReturnType<typeof createSchema>>;

export function ChangePasswordPage() {
  const { t: __t } = useTranslation();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(createSchema(__t)) });
  const submit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setApiError('');
    try {
      await changePassword({ currentPassword, newPassword });
      await hydrateSession();
      const user = useSessionStore.getState().user;
      if (user) void navigate(findFirstAuthorizedPath(user), { replace: true });
    } catch {
      setApiError(__t('auth.changePassword.leMotDePasseNAPasPuEtreModifie'));
    }
  });
  return (
    <div className="page-stack">
      <PageHeader
        title={__t('auth.changePassword.changerLeMotDePasse')}
        description={__t('auth.changePassword.passwordHint')}
      />
      <Card>
        <form
          className="form-stack"
          onSubmit={(e) => {
            void submit(e);
          }}
        >
          <FormField label={__t('auth.changePassword.motDePasseActuel')} required>
            <input
              type="password"
              autoComplete="current-password"
              {...register('currentPassword')}
            />
          </FormField>
          <FormField
            label={__t('auth.changePassword.nouveauMotDePasse')}
            required
            error={errors.newPassword ? __t('profile.passwordLength') : undefined}
          >
            <input type="password" autoComplete="new-password" {...register('newPassword')} />
          </FormField>
          <FormField
            label={__t('auth.changePassword.confirmation')}
            required
            error={errors.confirmation?.message}
          >
            <input type="password" autoComplete="new-password" {...register('confirmation')} />
          </FormField>
          {apiError ? (
            <p role="alert" className="field-error">
              {apiError}
            </p>
          ) : null}
          <Button variant="unstyled" className="button button-primary" disabled={isSubmitting} type="submit">
            <Save aria-hidden="true" />
            {__t('common.save')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
