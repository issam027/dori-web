import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { usersControllerUpdateUser } from '@/api/generated/users/users';
import { hydrateSession } from '@/core/auth/session-actions';
import { useSessionStore } from '@/core/auth/session-store';
import { Card } from '@/design-system/components/Card';
import { FormField } from '@/design-system/components/FormField';
import { PageHeader } from '@/design-system/components/PageHeader';

const schema = z.object({
  email: z.union([z.literal(''), z.email('Adresse email invalide.')]),
  languagePreference: z.string().min(2),
});
type ProfileForm = z.infer<typeof schema>;

export function ProfilePage() {
  const user = useSessionStore((state) => state.user);
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(schema),
    values: { email: user?.email ?? '', languagePreference: user?.languagePreference ?? 'fr' },
  });
  if (!user) return null;
  const submit = handleSubmit(async (values) => {
    setSaved(false);
    await usersControllerUpdateUser(user.userId, {
      email: values.email || undefined,
      languagePreference: values.languagePreference,
    });
    await hydrateSession();
    setSaved(true);
  });
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Compte"
        title="Mon profil"
        description="Votre identité, vos habilitations et vos préférences."
      />
      <div className="profile-layout">
        <Card className="profile-identity-card">
          <div className="profile-portrait">
            <span className="profile-avatar">{user.username.slice(0, 2).toUpperCase()}</span>
            <h2>{user.username}</h2>
            <p>{user.roles.join(' · ') || 'Compte utilisateur'}</p>
            <span className="status-badge status-success">Compte actif</span>
          </div>
          <dl className="detail-list">
            <div>
              <dt>Type de compte</dt>
              <dd>{user.userType === 'human' ? 'Humain' : 'Technique'}</dd>
            </div>
            <div>
              <dt>Permissions</dt>
              <dd>{user.permissions.length}</dd>
            </div>
            <div>
              <dt>Dernière connexion</dt>
              <dd>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '—'}</dd>
            </div>
            <div>
              <dt>Scope</dt>
              <dd>
                {user.scope.isGlobal
                  ? 'Global'
                  : `${String(user.scope.siteIds.length)} site(s), ${String(user.scope.queueIds.length)} file(s)`}
              </dd>
            </div>
          </dl>
        </Card>
        <Card className="profile-settings-card">
          <div className="card-heading">
            <div>
              <h2>Informations et préférences</h2>
              <p>Le rôle et le périmètre sont gérés par un administrateur.</p>
            </div>
          </div>
          <form
            className="form-stack"
            onSubmit={(e) => {
              void submit(e);
            }}
          >
            <FormField label="Email" error={errors.email?.message}>
              <input type="email" autoComplete="email" {...register('email')} />
            </FormField>
            <FormField label="Langue">
              <select {...register('languagePreference')}>
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </FormField>
            {saved ? <p role="status">Profil enregistré.</p> : null}
            <button className="button button-primary" disabled={isSubmitting} type="submit">
              Enregistrer
            </button>
          </form>
          <div className="profile-security-panel">
            <div>
              <strong>Sécurité du compte</strong>
              <p>Modifiez votre mot de passe depuis un parcours dédié et sécurisé.</p>
            </div>
            <Link className="button" to="/change-password">
              Changer mon mot de passe
            </Link>
          </div>
        </Card>
      </div>
      <div className="metrics-grid profile-scope-metrics">
        <Card>
          <span className="metric-label">Périmètre</span>
          <strong className="metric-value">
            {user.scope.isGlobal ? 'Global' : `${String(user.scope.siteIds.length)} site(s)`}
          </strong>
        </Card>
        <Card>
          <span className="metric-label">Files autorisées</span>
          <strong className="metric-value">
            {user.scope.isGlobal ? 'Toutes' : user.scope.queueIds.length}
          </strong>
        </Card>
        <Card>
          <span className="metric-label">Langue</span>
          <strong className="metric-value">{user.languagePreference ?? 'fr'}</strong>
        </Card>
      </div>
    </div>
  );
}
