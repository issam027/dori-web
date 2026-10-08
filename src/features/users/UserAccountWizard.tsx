import { useMemo, useState } from 'react';
import type { QueueResponseDto, RoleResponseDto, SiteResponseDto } from '@/api/generated/models';
import { usersControllerCreateUser } from '@/api/generated/users/users';
import { sitesControllerAssignManager } from '@/api/generated/sites/sites';
import { queuesControllerAssignOperator } from '@/api/generated/queues/queues';
import { WizardModal } from '@/design-system/components/WizardModal';
import { assignableRoles } from './user-rank';

export function UserAccountWizard({
  open,
  onOpenChange,
  roles,
  sites,
  queues,
  currentRoleRank,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roles: RoleResponseDto[];
  sites: SiteResponseDto[];
  queues: QueueResponseDto[];
  currentRoleRank: number;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState({
    username: '',
    email: '',
    password: 'Root@123456',
    language: 'fr',
    type: 'human',
    roleId: 0,
    siteIds: [] as number[],
    queueIds: [] as number[],
  });
  const allowed = useMemo(() => assignableRoles(roles, currentRoleRank), [roles, currentRoleRank]);
  const toggle = (key: 'siteIds' | 'queueIds', id: number) => {
    setF((v) => ({
      ...v,
      [key]: v[key].includes(id) ? v[key].filter((x) => x !== id) : [...v[key], id],
    }));
  };
  async function next() {
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    const result = await usersControllerCreateUser({
      username: f.username,
      email: f.email || undefined,
      password: f.password,
      languagePreference: f.language,
      userType: f.type as 'human' | 'kiosk',
      roleId: f.roleId,
    });
    const id = result.data.userId;
    const role = roles.find((r) => r.roleId === f.roleId)?.roleName.toLowerCase() ?? '';
    if (role.includes('manager'))
      for (const siteId of f.siteIds) await sitesControllerAssignManager(siteId, { userId: id });
    if (role.includes('operator'))
      for (const queueId of f.queueIds)
        await queuesControllerAssignOperator(queueId, { userId: id });
    onCreated();
    onOpenChange(false);
    setStep(1);
  }
  return (
    <WizardModal
      open={open}
      onOpenChange={onOpenChange}
      title="Créer un compte"
      step={step}
      stepCount={3}
      onPrevious={
        step > 1
          ? () => {
              setStep(step - 1);
            }
          : undefined
      }
      onNext={() => void next()}
      canContinue={
        step === 1
          ? Boolean(f.username && f.password.length >= 10)
          : step === 2
            ? Boolean(f.roleId)
            : true
      }
    >
      {step === 1 ? (
        <div className="form-grid">
          <label>
            Nom d’utilisateur *
            <input
              value={f.username}
              onChange={(e) => {
                setF({ ...f, username: e.target.value });
              }}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={f.email}
              onChange={(e) => {
                setF({ ...f, email: e.target.value });
              }}
            />
          </label>
          <label>
            Mot de passe *
            <input
              type="password"
              minLength={10}
              maxLength={20}
              value={f.password}
              onChange={(e) => {
                setF({ ...f, password: e.target.value });
              }}
            />
          </label>
          <label>
            Langue
            <select
              value={f.language}
              onChange={(e) => {
                setF({ ...f, language: e.target.value });
              }}
            >
              <option>fr</option>
              <option>ar</option>
              <option>en</option>
            </select>
          </label>
          <label>
            Type
            <select
              value={f.type}
              onChange={(e) => {
                setF({ ...f, type: e.target.value });
              }}
            >
              <option value="human">Humain</option>
              <option value="kiosk">Kiosque / display</option>
            </select>
          </label>
        </div>
      ) : null}
      {step === 2 ? (
        <div>
          <h3>Rôle initial</h3>
          <p className="muted">Les rôles de rang supérieur au vôtre sont masqués.</p>
          <div className="choice-grid">
            {allowed.map((r) => (
              <button
                type="button"
                key={r.roleId}
                className={`role-card ${f.roleId === r.roleId ? 'selected' : ''}`}
                onClick={() => {
                  setF({ ...f, roleId: r.roleId });
                }}
              >
                <b>{r.roleName}</b>
                <small>
                  Rang {r.rank} · {r.description}
                </small>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {step === 3 ? (
        <div>
          <h3>Périmètre</h3>
          <h4>Sites</h4>
          <div className="choice-grid">
            {sites.map((s) => (
              <label className="check-row" key={s.siteId}>
                {s.siteName}
                <input
                  type="checkbox"
                  checked={f.siteIds.includes(s.siteId)}
                  onChange={() => {
                    toggle('siteIds', s.siteId);
                  }}
                />
              </label>
            ))}
          </div>
          <h4>Files</h4>
          <div className="choice-grid">
            {queues.map((q) => (
              <label className="check-row" key={q.queueId}>
                {q.queueCode} · {q.queueName}
                <input
                  type="checkbox"
                  checked={f.queueIds.includes(q.queueId)}
                  onChange={() => {
                    toggle('queueIds', q.queueId);
                  }}
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </WizardModal>
  );
}
