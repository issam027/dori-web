import { useTranslation } from 'react-i18next';
import { KeyRound, LogIn, ShieldCheck } from 'lucide-react';
import type { TFunction } from 'i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { changePassword } from './api/password-api';
import { expireSession } from '@/core/auth/session-actions';
import { useSessionStore } from '@/core/auth/session-store';
import { Card } from '@/design-system/components/Card';
import { FormField } from '@/design-system/components/FormField';
import { PageHeader } from '@/design-system/components/PageHeader';
import { Button } from '@/design-system/components/Button';

const createSchema = (t: TFunction) =>
  z
    .object({
      currentPassword: z.string().min(1, t('validation.passwordRequired')),
      newPassword: z.string().min(10).max(20),
      confirmation: z.string(),
    })
    .refine((value) => value.newPassword === value.confirmation, {
      path: ['confirmation'],
      message: t('validation.passwordsDiffer'),
    });
type FormValues = z.infer<ReturnType<typeof createSchema>>;

export function ChangePasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const required = useSessionStore((state) => state.user?.mustChangePassword);
  const [apiError, setApiError] = useState('');
  const [visible, setVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(createSchema(t)) });
  const submit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setApiError('');
    try {
      await changePassword({ currentPassword, newPassword });
      await expireSession(queryClient);
      void navigate('/login', { replace: true, state: { passwordChanged: true } });
    } catch {
      setApiError(t('auth.changePassword.leMotDePasseNAPasPuEtreModifie'));
    }
  });
  return (
    <div className="page-stack password-change-page">
      <PageHeader
        title={t('auth.changePassword.changerLeMotDePasse')}
        description={t('auth.changePassword.passwordHint')}
      />
      <Card className="password-change-card">
        <div className="password-change-intro">
          <span className="password-change-icon" aria-hidden="true">
            <ShieldCheck />
          </span>
          <h2>{t('auth.changePassword.securityTitle')}</h2>
          {required ? <p>{t('auth.changePassword.requiredHelp')}</p> : null}
          <p>{t('auth.changePassword.sessionHelp')}</p>
          <div className="password-change-guidance">
            <KeyRound aria-hidden="true" />
            <span>{t('auth.changePassword.passwordHint')}</span>
          </div>
        </div>
        <form
          className="form-stack password-change-form"
          onSubmit={(event) => {
            void submit(event);
          }}
          aria-busy={isSubmitting}
        >
          <FormField
            label={t('auth.changePassword.motDePasseActuel')}
            required
            error={errors.currentPassword?.message}
          >
            <input
              type={visible ? 'text' : 'password'}
              autoComplete="current-password"
              {...register('currentPassword')}
            />
          </FormField>
          <FormField
            label={t('auth.changePassword.nouveauMotDePasse')}
            required
            error={errors.newPassword ? t('profile.passwordLength') : undefined}
          >
            <input
              type={visible ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('newPassword')}
            />
          </FormField>
          <FormField
            label={t('auth.changePassword.confirmation')}
            required
            error={errors.confirmation?.message}
          >
            <input
              type={visible ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('confirmation')}
            />
          </FormField>
          <label className="check-row">
            <input
              type="checkbox"
              checked={visible}
              onChange={(event) => {
                setVisible(event.target.checked);
              }}
            />
            {t('auth.changePassword.showPasswords')}
          </label>
          {apiError ? (
            <p role="alert" className="field-error">
              {apiError}
            </p>
          ) : null}
          <Button variant="primary" disabled={isSubmitting} type="submit">
            <LogIn aria-hidden="true" />
            {t(isSubmitting ? 'common.saving' : 'auth.changePassword.saveAndSignIn')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
