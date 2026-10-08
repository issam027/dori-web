import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
      <div className="profile-grid">
        <Card>
          <h2>Identité</h2>
          <dl className="detail-list">
            <div>
              <dt>Nom utilisateur</dt>
              <dd>{user.username}</dd>
            </div>
            <div>
              <dt>Type de compte</dt>
              <dd>{user.userType}</dd>
            </div>
            <div>
              <dt>Rôles</dt>
              <dd>{user.roles.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>Dernière connexion</dt>
              <dd>{user.lastLogin ?? '—'}</dd>
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
        <Card>
          <h2>Préférences modifiables</h2>
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
        </Card>
      </div>
    </div>
  );
}
