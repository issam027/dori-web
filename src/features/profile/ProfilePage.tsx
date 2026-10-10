import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { changePassword, updateUser } from './api/profile-api';
import { hydrateSession } from '@/core/auth/session-actions';
import { useSessionStore } from '@/core/auth/session-store';
import { Card } from '@/design-system/components/Card';
import { FormField } from '@/design-system/components/FormField';
import { PageHeader } from '@/design-system/components/PageHeader';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';

const createSchema = (t: TFunction) => z.object({
  email: z.union([z.literal(''), z.email(t('validation.emailInvalid'))]),
  languagePreference: z.string().min(2),
});
type ProfileForm = z.infer<ReturnType<typeof createSchema>>;
const createPasswordSchema = (t: TFunction) =>
  z
    .object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(10).max(20),
      confirmation: z.string(),
    })
    .refine((value) => value.newPassword === value.confirmation, {
      path: ['confirmation'],
      message: t('validation.passwordsDiffer'),
    });
type PasswordForm = z.infer<ReturnType<typeof createPasswordSchema>>;

export function ProfilePage() {
  const { t: __t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const [saved, setSaved] = useState(false);
  const [passwordEditing, setPasswordEditing] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(createSchema(__t)),
    values: { email: user?.email ?? '', languagePreference: user?.languagePreference ?? 'fr' },
  });
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: passwordSubmitting },
  } = useForm<PasswordForm>({ resolver: zodResolver(createPasswordSchema(__t)) });
  if (!user) return null;
  const submit = handleSubmit(async (values) => {
    setSaved(false);
    try {
      await updateUser(user.userId, {
        email: values.email || undefined,
        languagePreference: values.languagePreference,
      });
      await hydrateSession();
      setSaved(true);
      notify({ tone: 'success', title: __t('notifications.profile.saved') });
    } catch (error) {
      notifyError(error);
    }
  });
  const submitPassword = handlePasswordSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await changePassword({ currentPassword, newPassword });
      await hydrateSession();
      resetPassword();
      setPasswordEditing(false);
      notify({ tone: 'success', title: __t('profile.passwordUpdated') });
    } catch (error) {
      notifyError(error);
    }
  });
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Compte"
        title={__t('ui.profile.profile_page.mon_profil_9ov59t')}
        description={__t(
          'ui.profile.profile_page.votre_identite_vos_habilitations_et_vos_preferen_1ixmftf',
        )}
      />
      <div className="profile-layout">
        <Card className="profile-identity-card">
          <div className="profile-portrait">
            <span className="profile-avatar">{user.username.slice(0, 2).toUpperCase()}</span>
            <h2>{user.username}</h2>
            <p>
              {user.roles.join(' · ') ||
                __t('ui.expression.profile.profile_page.compte_utilisateur_1twv5sm')}
            </p>
            <span className="status-badge status-success">
              {__t('ui.profile.profile_page.compte_actif_12z992e')}
            </span>
          </div>
          <dl className="detail-list">
            <div>
              <dt>{__t('ui.profile.profile_page.type_de_compte_h99ahc')}</dt>
              <dd>
                {user.userType === 'human'
                  ? __t('ui.expression.profile.profile_page.humain_18e4n9r')
                  : __t('ui.expression.profile.profile_page.technique_tmfbah')}
              </dd>
            </div>
            <div>
              <dt>{__t('ui.profile.profile_page.permissions_11gikqr')}</dt>
              <dd>{user.permissions.length}</dd>
            </div>
            <div>
              <dt>{__t('ui.profile.profile_page.derniere_connexion_2t8q7t')}</dt>
              <dd>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '—'}</dd>
            </div>
            <div>
              <dt>{__t('ui.profile.profile_page.scope_rpvfkb')}</dt>
              <dd>
                {user.scope.isGlobal
                  ? __t('ui.expression.profile.profile_page.global_rrldxq')
                  : __t('ui.expression.profile.profile_page.value0_site_s_value1_file_s_l4y6h', {
                      value0: String(user.scope.siteIds.length),
                      value1: String(user.scope.queueIds.length),
                    })}
              </dd>
            </div>
          </dl>
        </Card>
        <Card className="profile-settings-card">
          <div className="card-heading">
            <div>
              <h2>{__t('ui.profile.profile_page.informations_et_preferences_10ds0hx')}</h2>
              <p>
                {__t(
                  'ui.profile.profile_page.le_role_et_le_perimetre_sont_geres_par_un_admini_q8b8gl',
                )}
              </p>
            </div>
          </div>
          <form
            className="form-stack"
            onSubmit={(e) => {
              void submit(e);
            }}
          >
            <FormField
              label={__t('ui.profile.profile_page.email_inbfc7')}
              error={errors.email?.message}
            >
              <input type="email" autoComplete="email" {...register('email')} />
            </FormField>
            <FormField label={__t('ui.profile.profile_page.langue_4vkz5r')}>
              <select {...register('languagePreference')}>
                <option value="fr">{__t('ui.profile.profile_page.francais_1x2mspi')}</option>
                <option value="en">{__t('ui.profile.profile_page.english_7nql6j')}</option>
                <option value="ar">العربية</option>
              </select>
            </FormField>
            {saved ? (
              <p role="status">{__t('ui.profile.profile_page.profil_enregistre_1kk86qt')}</p>
            ) : null}
            <button className="button button-primary" disabled={isSubmitting} type="submit">
              {__t('ui.profile.profile_page.enregistrer_sywgdx')}
            </button>
          </form>
          <div className={`profile-security-panel${passwordEditing ? ' is-editing' : ''}`}>
            {!passwordEditing ? (
              <>
                <div>
                  <strong>{__t('ui.profile.profile_page.securite_du_compte_jw1voy')}</strong>
                  <p>
                    {__t(
                      'ui.profile.profile_page.modifiez_votre_mot_de_passe_depuis_un_parcours_d_o6z9ng',
                    )}
                  </p>
                </div>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    setPasswordEditing(true);
                  }}
                >
                  {__t('ui.profile.profile_page.changer_mon_mot_de_passe_1pun60i')}
                </button>
              </>
            ) : (
              <div className="profile-password-editor">
                <div>
                  <strong>{__t('profile.changePasswordTitle')}</strong>
                  <p>{__t('profile.changePasswordHelp')}</p>
                </div>
                <form
                  className="form-grid"
                  onSubmit={(event) => {
                    void submitPassword(event);
                  }}
                >
                  <FormField label={__t('profile.currentPassword')} required>
                    <input
                      type="password"
                      autoComplete="current-password"
                      {...registerPassword('currentPassword')}
                    />
                  </FormField>
                  <FormField
                    label={__t('profile.newPassword')}
                    required
                    error={passwordErrors.newPassword ? __t('profile.passwordLength') : undefined}
                  >
                    <input
                      type="password"
                      autoComplete="new-password"
                      {...registerPassword('newPassword')}
                    />
                  </FormField>
                  <FormField
                    label={__t('profile.passwordConfirmation')}
                    required
                    error={passwordErrors.confirmation?.message}
                  >
                    <input
                      type="password"
                      autoComplete="new-password"
                      {...registerPassword('confirmation')}
                    />
                  </FormField>
                  <div className="profile-password-actions">
                    <button
                      className="button"
                      type="button"
                      disabled={passwordSubmitting}
                      onClick={() => {
                        resetPassword();
                        setPasswordEditing(false);
                      }}
                    >
                      {__t('common.cancel')}
                    </button>
                    <button
                      className="button button-primary"
                      type="submit"
                      disabled={passwordSubmitting}
                    >
                      {__t('profile.updatePassword')}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </Card>
      </div>
      <div className="metrics-grid profile-scope-metrics">
        <Card>
          <span className="metric-label">{__t('ui.profile.profile_page.perimetre_ai7per')}</span>
          <strong className="metric-value">
            {user.scope.isGlobal
              ? __t('ui.expression.profile.profile_page.global_rrldxq')
              : __t('ui.expression.profile.profile_page.value0_site_s_a2wlej', {
                  value0: String(user.scope.siteIds.length),
                })}
          </strong>
        </Card>
        <Card>
          <span className="metric-label">
            {__t('ui.profile.profile_page.files_autorisees_z62lee')}
          </span>
          <strong className="metric-value">
            {user.scope.isGlobal
              ? __t('ui.expression.profile.profile_page.toutes_1krg1dl')
              : user.scope.queueIds.length}
          </strong>
        </Card>
        <Card>
          <span className="metric-label">{__t('ui.profile.profile_page.langue_4vkz5r')}</span>
          <strong className="metric-value">
            {user.languagePreference ?? __t('ui.expression.profile.profile_page.fr_o6dm29')}
          </strong>
        </Card>
      </div>
    </div>
  );
}
