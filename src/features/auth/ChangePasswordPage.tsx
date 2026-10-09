import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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

const createSchema = (t: TFunction) => z
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
      await authControllerChangePassword({ currentPassword, newPassword });
      await hydrateSession();
      const user = useSessionStore.getState().user;
      if (user) void navigate(findFirstAuthorizedPath(user), { replace: true });
    } catch {
      setApiError(
        __t(
          'ui.expression.auth.change_password_page.le_mot_de_passe_n_a_pas_pu_etre_modifie_1lvgut4',
        ),
      );
    }
  });
  return (
    <div className="page-stack">
      <PageHeader
        title={__t('ui.auth.change_password_page.changer_le_mot_de_passe_1i41l8b')}
        description={__t(
          'ui.auth.change_password_page.choisissez_un_mot_de_passe_de_10_a_20_caracteres_1gdne07',
        )}
      />
      <Card>
        <form
          className="form-stack"
          onSubmit={(e) => {
            void submit(e);
          }}
        >
          <FormField
            label={__t('ui.auth.change_password_page.mot_de_passe_actuel_43q4tg')}
            required
          >
            <input
              type="password"
              autoComplete="current-password"
              {...register('currentPassword')}
            />
          </FormField>
          <FormField
            label={__t('ui.auth.change_password_page.nouveau_mot_de_passe_hl1ug5')}
            required
            error={errors.newPassword ? 'Entre 10 et 20 caractères.' : undefined}
          >
            <input type="password" autoComplete="new-password" {...register('newPassword')} />
          </FormField>
          <FormField
            label={__t('ui.auth.change_password_page.confirmation_p3snlg')}
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
          <button className="button button-primary" disabled={isSubmitting} type="submit">
            {__t('ui.auth.change_password_page.enregistrer_sywgdx')}
          </button>
        </form>
      </Card>
    </div>
  );
}
