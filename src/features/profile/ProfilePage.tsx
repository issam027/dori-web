import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Check, Globe2, KeyRound, Languages, ListChecks, Palette, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { changePassword, updateUser } from './api/profile-api';
import { hydrateSession } from '@/core/auth/session-actions';
import { useSessionStore } from '@/core/auth/session-store';
import { Card, MetricCard } from '@/design-system/components/Card';
import { FormField } from '@/design-system/components/FormField';
import { PageHeader } from '@/design-system/components/PageHeader';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { usePreferencesStore } from '@/core/theme/preferences-store';
import { accentColors } from '@/core/theme/theme';

const createSchema = (t: TFunction) =>
  z.object({
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
  const accentColor = usePreferencesStore((state) => state.accentColor);
  const setAccentColor = usePreferencesStore((state) => state.setAccentColor);
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
        eyebrow={__t('profile.title')}
        title={__t('profile.profile.monProfil')}
        description={__t('profile.profile.votreIdentiteVosHabilitationsEtVosPreferen')}
      />
      <div className="profile-layout">
        <Card className="profile-identity-card">
          <div className="profile-portrait">
            <span className="profile-avatar">{user.username.slice(0, 2).toUpperCase()}</span>
            <h2>{user.username}</h2>
            <p>{user.roles.join(' · ') || __t('profile.profile.compteUtilisateur')}</p>
            <span className="status-badge status-success">
              {__t('profile.profile.compteActif')}
            </span>
          </div>
          <dl className="detail-list">
            <div>
              <dt>{__t('profile.profile.typeDeCompte')}</dt>
              <dd>
                {user.userType === 'human'
                  ? __t('common.humain')
                  : __t('profile.profile.technique')}
              </dd>
            </div>
            <div>
              <dt>{__t('profile.profile.permissions')}</dt>
              <dd>{user.permissions.length}</dd>
            </div>
            <div>
              <dt>{__t('profile.profile.derniereConnexion')}</dt>
              <dd>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '—'}</dd>
            </div>
            <div>
              <dt>{__t('common.scope')}</dt>
              <dd>
                {user.scope.isGlobal
                  ? __t('profile.profile.global')
                  : __t('profile.scope.sitesAndQueues', {
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
              <h2>{__t('profile.profile.informationsEtPreferences')}</h2>
              <p>{__t('profile.profile.leRoleEtLePerimetreSontGeresParUnAdmini')}</p>
            </div>
          </div>
          <form
            className="form-stack"
            onSubmit={(e) => {
              void submit(e);
            }}
          >
            <FormField label={__t('common.email')} error={errors.email?.message}>
              <input type="email" autoComplete="email" {...register('email')} />
            </FormField>
            <FormField label={__t('common.language')}>
              <select {...register('languagePreference')}>
                <option value="fr" aria-label={__t('locale.fr')}>
                  {String.fromCodePoint(0x1f1eb, 0x1f1f7)}
                </option>
                <option value="en" aria-label={__t('common.english')}>
                  {String.fromCodePoint(0x1f1ec, 0x1f1e7)}
                </option>
                <option value="ar" aria-label="العربية">
                  {String.fromCodePoint(0x1f1f9, 0x1f1f3)}
                </option>
              </select>
            </FormField>
            {saved ? <p role="status">{__t('profile.profile.profilEnregistre')}</p> : null}
            <button className="button button-primary" disabled={isSubmitting} type="submit">
              <Save aria-hidden="true" />
              {__t('common.save')}
            </button>
          </form>
          <section className="profile-appearance-panel" aria-labelledby="profile-appearance-title">
            <div className="profile-appearance-heading">
              <span className="profile-appearance-icon" aria-hidden="true">
                <Palette />
              </span>
              <div>
                <strong id="profile-appearance-title">{__t('profile.appearance.title')}</strong>
                <p>{__t('profile.appearance.description')}</p>
              </div>
            </div>
            <div
              className="profile-color-palette"
              role="radiogroup"
              aria-label={__t('profile.appearance.dominantColor')}
            >
              {accentColors.map((color) => {
                const selected = color.id === accentColor;
                const label = __t(color.labelKey);
                return (
                  <button
                    key={color.id}
                    className={'profile-color-swatch' + (selected ? ' is-selected' : '')}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={label}
                    title={label}
                    style={{ backgroundColor: color.value }}
                    onClick={() => {
                      setAccentColor(color.id);
                    }}
                  >
                    {selected ? <Check aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
            <small className="profile-color-selection">
              {__t('profile.appearance.selectedColor')} ?{' '}
              <strong>
                {__t(
                  accentColors.find((color) => color.id === accentColor)?.labelKey ??
                    accentColors[0].labelKey,
                )}
              </strong>
            </small>
          </section>
          <div className={`profile-security-panel${passwordEditing ? ' is-editing' : ''}`}>
            {!passwordEditing ? (
              <>
                <div>
                  <strong>{__t('profile.profile.securiteDuCompte')}</strong>
                  <p>{__t('profile.profile.modifiezVotreMotDePasseDepuisUnParcoursD')}</p>
                </div>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    setPasswordEditing(true);
                  }}
                >
                  <KeyRound aria-hidden="true" />
                  {__t('profile.profile.changerMonMotDePasse')}
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
                      <Save aria-hidden="true" />
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
        <MetricCard
          label={__t('common.perimetre')}
          value={
            user.scope.isGlobal
              ? __t('profile.profile.global')
              : __t('profile.scope.sites', {
                  value0: String(user.scope.siteIds.length),
                })
          }
          icon={<Globe2 />}
        />
        <MetricCard
          label={__t('profile.profile.filesAutorisees')}
          value={user.scope.isGlobal ? __t('profile.profile.toutes') : user.scope.queueIds.length}
          icon={<ListChecks />}
        />
        <MetricCard
          label={__t('common.language')}
          value={user.languagePreference ?? __t('common.fr')}
          icon={<Languages />}
        />
      </div>
    </div>
  );
}
