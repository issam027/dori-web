import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import type { QueueResponseDto, RoleResponseDto, SiteResponseDto } from '@/api/generated/models';
import { usersControllerCreateUser } from '@/api/generated/users/users';
import { sitesControllerAssignDirectUser } from '@/api/generated/sites/sites';
import { queuesControllerAssignOperator } from '@/api/generated/queues/queues';
import { WizardModal } from '@/design-system/components/WizardModal';
import { assignableRoles } from './user-rank';
import { Button } from '@/design-system/components/Button';

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
  const { t: __t } = useTranslation();
  const [step, setStep] = useState(1);
  const [f, setF] = useState({
    username: '',
    fullName: '',
    email: '',
    password: 'Root@123456',
    language: 'fr',
    roleId: 0,
    siteIds: [] as number[],
    queueIds: [] as number[],
  });
  const allowed = useMemo(() => assignableRoles(roles, currentRoleRank), [roles, currentRoleRank]);
  const selectedRole = roles.find((role) => role.roleId === f.roleId)?.roleName.toLowerCase() ?? '';
  const isKiosk = selectedRole.includes('kiosk') || selectedRole.includes('kiosque');
  const userType: 'human' | 'kiosk' = isKiosk ? 'kiosk' : 'human';
  const assignsQueues = isKiosk || selectedRole.includes('operat') || selectedRole.includes('hotesse');
  const assignsSites = !assignsQueues && (selectedRole.includes('admin') || selectedRole.includes('manager'));
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
      fullName: f.fullName.trim() || undefined,
      email: f.email || undefined,
      password: f.password,
      languagePreference: f.language,
      userType,
      roleId: f.roleId,
    });
    const id = result.data.userId;
    const role = roles.find((r) => r.roleId === f.roleId)?.roleName.toLowerCase() ?? '';
    if (role.includes('manager') || role.includes('admin'))
      for (const siteId of f.siteIds) await sitesControllerAssignDirectUser(siteId, { userId: id });
    if (isKiosk || role.includes('operat') || role.includes('hotesse'))
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
      title={__t('users.userAccountWizard.creerUnCompte')}
      className="user-account-wizard-dialog"
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
            : assignsQueues
              ? f.queueIds.length > 0
              : assignsSites
                ? f.siteIds.length > 0
                : true
      }
    >
      <div className="user-account-wizard">
      <div className="wizard-progress" aria-label={__t('wizard.progress', { step: String(step), stepCount: '3' })}>
        {[1, 2, 3].map((item) => <span key={item} className={item <= step ? 'is-complete' : undefined} />)}
      </div>
      {step === 1 ? (
        <section className="user-wizard-step">
          <div className="wizard-step-heading"><span>1</span><div><h3>{__t('users.userAccountWizard.creerUnCompte')}</h3><p>{__t('admin.users.identiteEtPreferencesDuCompte')}</p></div></div>
        <div className="form-grid">
          <label>
            {__t('common.fullName')}
            <input
              autoComplete="name"
              maxLength={150}
              value={f.fullName}
              onChange={(e) => {
                setF({ ...f, fullName: e.target.value });
              }}
            />
          </label>
          <label>
            {__t('users.userAccountWizard.nomDUtilisateur')}
            <input
              value={f.username}
              onChange={(e) => {
                setF({ ...f, username: e.target.value });
              }}
            />
          </label>
          <label>
            {__t('common.email')}
            <input
              type="email"
              value={f.email}
              onChange={(e) => {
                setF({ ...f, email: e.target.value });
              }}
            />
          </label>
          <label>
            {__t('users.userAccountWizard.motDePasse')}
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
            {__t('common.language')}
            <select
              value={f.language}
              onChange={(e) => {
                setF({ ...f, language: e.target.value });
              }}
            >
              <option value="fr">{__t('common.fr')}</option>
              <option value="ar">{__t('common.ar')}</option>
              <option value="en">{__t('common.en')}</option>
            </select>
          </label>
        </div></section>
      ) : null}
      {step === 2 ? (
        <section className="user-wizard-step">
          <div className="wizard-step-heading"><span>2</span><div><h3>{__t('users.userAccountWizard.roleInitial')}</h3><p>{__t('users.userAccountWizard.lesRolesDeRangSuperieurAuVotreSontMasque')}</p></div></div>
          <div className="choice-grid">
            {allowed.map((r) => (
              <Button variant="unstyled"
                type="button"
                key={r.roleId}
                className={`role-card ${f.roleId === r.roleId ? 'selected' : ''}`}
                onClick={() => {
                  setF({ ...f, roleId: r.roleId });
                }}
              >
                <b>{r.roleName}</b>
                <small>
                  {__t('users.userAccountWizard.rang')}
                  {r.rank} · {r.description}
                </small>
              </Button>
            ))}
          </div>
        </section>
      ) : null}
      {step === 3 ? (
        <section className="user-wizard-step">
          <div className="wizard-step-heading"><span>3</span><div><h3>{__t('common.perimetre')}</h3><p>{assignsQueues ? __t('settings.queueRoleContract') : __t('settings.siteRoleContract')}</p></div></div>
          {assignsSites ? <>
          <div className="choice-grid">
            {sites.map((s) => (
              <label className={`role-card assignment-choice-card ${f.siteIds.includes(s.siteId) ? 'selected' : ''}`} key={s.siteId}>
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
          </div></> : null}
          {assignsQueues ? <>
          <div className="choice-grid">
            {queues.map((q) => (
              <label className={`role-card assignment-choice-card ${f.queueIds.includes(q.queueId) ? 'selected' : ''}`} key={q.queueId}>
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
            {queues.length === 0 ? <p className="user-wizard-empty">{__t('common.aucuneFileConfiguree')}</p> : null}
          </div></> : null}
        </section>
      ) : null}
      </div>
    </WizardModal>
  );
}
