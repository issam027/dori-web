import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import {
  associateTier,
  createQueueForSite,
  createSite,
  createTierRule,
  deleteSite,
  findTiers,
  removeQueue,
  updateQueue,
  updateSite,
} from '../api/onboarding-api';
import type { CreateQueueDto } from '@/api/generated/models';
import { Card } from '@/design-system/components/Card';
import { Modal } from '@/design-system/components/Modal';
import { PageHeader } from '@/design-system/components/PageHeader';
import { QueueEditor } from '@/features/queues/QueueEditor';
import { serviceTierVisualClass } from '@/design-system/service-tier';
import {
  loadOnboardingDraft,
  clearOnboardingDraft,
  initialOnboardingDraft,
  queueNeedsCreation,
  saveOnboardingDraft,
  type OnboardingDraft,
  type OnboardingTierConfiguration,
} from '../model/onboarding-draft';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { queryKeys } from '@/api/client/query-keys';
import {
  canAdvanceOnboarding,
  completeSiteActivation,
  moveToPreviousOnboardingStep,
  recordCreatedQueue,
} from '../model/onboarding-workflow';
import { Button } from '@/design-system/components/Button';

const stepKeys = [
  'onboarding.steps.identity',
  'onboarding.steps.defaults',
  'onboarding.steps.queues',
  'onboarding.steps.tiers',
  'onboarding.steps.team',
  'onboarding.steps.review',
] as const;

export function OnboardingWizard() {
  const { t: __t } = useTranslation();
  const [draft, setState] = useState<OnboardingDraft>(() => loadOnboardingDraft());
  const [queueOpen, setQueueOpen] = useState(false);
  const [editingQueueCode, setEditingQueueCode] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const tiers = useQuery({
    queryKey: queryKeys.tiers.catalog('onboarding'),
    queryFn: () => findTiers({ page: 1, pageSize: 100 }),
    enabled: draft.step === 4,
  });
  const fixed = (tiers.data?.data.items ?? []).filter((tier) => tier.isActive);

  const save = (next: OnboardingDraft) => {
    setState(next);
    saveOnboardingDraft(next);
  };
  const site = (key: keyof OnboardingDraft['site'], value: unknown) => {
    save({ ...draft, site: { ...draft.site, [key]: value } });
  };
  async function discardDraft() {
    if (!draft.confirmedSiteId || discarding) return;

    setDiscarding(true);
    setMessage('');
    let remainingQueueIds = { ...draft.confirmedQueueIds };
    try {
      for (const queueId of new Set(Object.values(remainingQueueIds))) {
        await removeQueue(queueId);
        remainingQueueIds = Object.fromEntries(
          Object.entries(remainingQueueIds).filter(([, id]) => id !== queueId),
        );
        saveOnboardingDraft({
          ...draft,
          confirmedQueueIds: remainingQueueIds,
          associatedTierQueueIds: draft.associatedTierQueueIds.filter((id) => id !== queueId),
        });
      }

      await deleteSite(draft.confirmedSiteId);
      clearOnboardingDraft();
      setState(structuredClone(initialOnboardingDraft));
      setEditingQueueCode(undefined);
      setQueueOpen(false);
      setDiscardOpen(false);
      notify({ tone: 'info', title: __t('onboarding.draftDiscarded') });
    } catch (error) {
      const recoverableDraft = {
        ...draft,
        confirmedQueueIds: remainingQueueIds,
        associatedTierQueueIds: draft.associatedTierQueueIds.filter((id) =>
          Object.values(remainingQueueIds).includes(id),
        ),
      };
      setState(recoverableDraft);
      saveOnboardingDraft(recoverableDraft);
      setMessage(__t('onboarding.discardDraftFailed'));
      notifyError(error);
    } finally {
      setDiscarding(false);
    }
  }
  async function next() {
    setBusy(true);
    setMessage('');
    try {
      let value = { ...draft };
      if (draft.step === 1 && !draft.confirmedSiteId) {
        if (!draft.site.siteName.trim()) throw new Error(__t('onboarding.errors.siteNameRequired'));
        const result = await createSite(draft.site);
        value = { ...value, confirmedSiteId: result.data.siteId };
      } else if (draft.step === 2 && draft.confirmedSiteId) {
        await updateSite(draft.confirmedSiteId, draft.site);
      } else if (draft.step === 3 && draft.confirmedSiteId) {
        const ids = { ...draft.confirmedQueueIds };
        for (const queue of draft.queues) {
          if (!queueNeedsCreation({ ...draft, confirmedQueueIds: ids }, queue)) continue;
          const result = await createQueueForSite(draft.confirmedSiteId, queue);
          ids[queue.queueCode.toUpperCase()] = result.data.queueId;
          value = recordCreatedQueue(value, queue, result.data.queueId);
          save(value);
        }
      } else if (draft.step === 4) {
        const done = new Set(draft.associatedTierQueueIds);
        for (const queueId of Object.values(draft.confirmedQueueIds)) {
          if (done.has(queueId)) continue;
          const selected = fixed.filter((tier) =>
            (draft.selectedTierIds[String(queueId)] ?? []).includes(tier.tierId),
          );
          if (selected.length === 0) throw new Error(__t('onboarding.errors.tierRequiredPerQueue'));
          for (const [index, tier] of selected.entries()) {
            const configuration = draft.tierConfigurations[String(queueId)]?.[String(tier.tierId)];
            await associateTier(queueId, {
              tierId: tier.tierId,
              price: configuration?.price ?? 0,
              currency: configuration?.currency || null,
              displayOrder: configuration?.displayOrder ?? index + 1,
              isDefault: configuration?.isDefault ?? index === 0,
            });
            if (configuration?.welcomeSms)
              await createTierRule(queueId, tier.tierId, {
                notificationType: 'welcome',
                channel: 'sms',
                includeTrackingLink: configuration.includeTrackingLink,
              });
            if (configuration?.welcomeEmail)
              await createTierRule(queueId, tier.tierId, {
                notificationType: 'welcome',
                channel: 'email',
                includeTrackingLink: configuration.includeTrackingLink,
              });
            if (configuration?.alertSms)
              await createTierRule(queueId, tier.tierId, {
                notificationType: 'threshold',
                channel: 'sms',
                thresholdType: configuration.alertThresholdType,
                thresholdValue: configuration.alertPosition,
                includeTrackingLink: configuration.includeTrackingLink,
              });
          }
          done.add(queueId);
          value = { ...value, associatedTierQueueIds: [...done] };
          save(value);
        }
      } else if (draft.step === 6 && draft.confirmedSiteId) {
        await updateSite(draft.confirmedSiteId, { isActive: true });
        const { activatedSiteName: activatedSite, nextDraft } = completeSiteActivation(draft);
        clearOnboardingDraft();
        setState(nextDraft);
        notify({
          tone: 'success',
          title: __t('notifications.site.activated'),
          message: __t('notifications.site.activatedMessage', { site: activatedSite }),
          duration: 8_000,
        });
        setMessage(
          __t('onboarding.activation.successMessage', {
            value0: activatedSite,
          }),
        );
        return;
      }
      value.step = Math.min(6, draft.step + 1);
      save(value);
      setMessage(__t('common.etapeEnregistreeAvecSucces'));
    } catch (error) {
      notifyError(error);
      setMessage(error instanceof Error ? error.message : __t('onboarding.errors.retryStep'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-stack admin-page">
      <PageHeader
        eyebrow={__t('onboarding.guidedAdministration')}
        title={__t('onboarding.onboarding.configurerUnNouveauSite')}
        description={__t('onboarding.onboarding.uneConfigurationProgressiveEnregistreeAChaq')}
        actions={
          <span className="status-badge status-info">
            {__t('common.etape')}
            {draft.step} {__t('onboarding.totalSteps')}
          </span>
        }
      />
      {draft.confirmedSiteId ? (
        <Card className="resume-card">
          <div>
            <b>{__t('onboarding.onboarding.configurationRepriseAutomatiquement')}</b>
            <p>
              {__t('onboarding.onboarding.site')}
              {draft.confirmedSiteId} {__t('onboarding.onboarding.confirme')}
              {Object.keys(draft.confirmedQueueIds).length}{' '}
              {__t('onboarding.onboarding.fileSConfirmeeS')}
            </p>
          </div>
          <div className="resume-card-actions">
            <span className="status-badge status-success">
              {__t('onboarding.onboarding.brouillonLocal')}
            </span>
            <Button variant="unstyled"
              className="button button-danger button-small"
              type="button"
              disabled={discarding}
              onClick={() => {
                setDiscardOpen(true);
              }}
            >
              {__t('onboarding.discardDraft')}
            </Button>
          </div>
        </Card>
      ) : null}
      <div className="onboarding-layout">
        <Card className="setup-navigation">
          <h2>{__t('onboarding.onboarding.parcoursDeConfiguration')}</h2>
          {stepKeys.map((key, index) => (
            <Button variant="unstyled" type="submit"
              key={key}
              className={`setup-nav-row ${draft.step === index + 1 ? 'active' : ''}`}
              disabled={index + 1 > draft.step}
              onClick={() => {
                save({ ...draft, step: index + 1 });
              }}
            >
              <span className="ticket-chip">{index + 1}</span>
              <span>
                <b>{__t(key)}</b>
              </span>
              {index + 1 < draft.step ? (
                <span className="status-badge status-success">
                  {__t('onboarding.onboarding.termine')}
                </span>
              ) : null}
            </Button>
          ))}
        </Card>
        <Card className="setup-content">
          <div className="setup-progress">
            {stepKeys.map((_, index) => (
              <span key={index} className={index < draft.step ? 'done' : ''} />
            ))}
          </div>
          {draft.step === 1 ? <Identity draft={draft} update={site} /> : null}
          {draft.step === 2 ? <Defaults draft={draft} update={site} /> : null}
          {draft.step === 3 ? (
            <QueuesStep
              draft={draft}
              open={() => {
                setEditingQueueCode(undefined);
                setQueueOpen(true);
              }}
              edit={(queueCode) => {
                setEditingQueueCode(queueCode);
                setQueueOpen(true);
              }}
            />
          ) : null}
          {draft.step === 4 ? (
            <TiersStep fixed={fixed} loading={tiers.isLoading} draft={draft} save={save} />
          ) : null}
          {draft.step === 5 ? <TeamStep /> : null}
          {draft.step === 6 ? <ReviewStep draft={draft} save={save} /> : null}
          {message ? (
            <p className="admin-message" role="status">
              {message}
            </p>
          ) : null}
          <div className="setup-actions">
            <Button variant="unstyled" type="submit"
              className="button"
              disabled={draft.step === 1 || busy}
              onClick={() => {
                save(moveToPreviousOnboardingStep(draft));
              }}
            >
              {__t('onboarding.onboarding.precedent')}
            </Button>
            <div>
              <Button variant="unstyled" type="submit"
                className="button"
                onClick={() => {
                  saveOnboardingDraft(draft);
                }}
              >
                {__t('common.enregistrerLeBrouillon')}
              </Button>
              <Button variant="unstyled" type="submit"
                className="button button-primary"
                disabled={busy || !canAdvanceOnboarding(draft, fixed.length)}
                onClick={() => void next()}
              >
                {draft.step === 6
                  ? __t('onboarding.onboarding.activerLeSite')
                  : __t('common.enregistrerEtContinuer')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
      <QueueEditor
        key={editingQueueCode ?? 'new-queue'}
        open={queueOpen}
        initial={draft.queues.find((queue) => queue.queueCode === editingQueueCode)}
        onOpenChange={(open) => {
          setQueueOpen(open);
          if (!open) setEditingQueueCode(undefined);
        }}
        onSave={async (queue: CreateQueueDto) => {
          const originalCode = editingQueueCode;
          const confirmedQueueId = originalCode
            ? draft.confirmedQueueIds[originalCode.toUpperCase()]
            : undefined;
          if (confirmedQueueId) await updateQueue(confirmedQueueId, queue);
          const confirmedQueueIds =
            confirmedQueueId && originalCode
              ? {
                  ...Object.fromEntries(
                    Object.entries(draft.confirmedQueueIds).filter(
                      ([code]) => code !== originalCode.toUpperCase(),
                    ),
                  ),
                  [queue.queueCode.toUpperCase()]: confirmedQueueId,
                }
              : { ...draft.confirmedQueueIds };
          save({
            ...draft,
            confirmedQueueIds,
            queues: [
              ...draft.queues.filter((item) =>
                originalCode ? item.queueCode !== originalCode : item.queueCode !== queue.queueCode,
              ),
              queue,
            ],
          });
        }}
      />
      <Modal
        open={discardOpen}
        onOpenChange={(open) => {
          if (!discarding) setDiscardOpen(open);
        }}
        title={__t('onboarding.discardDraftTitle')}
        description={__t('onboarding.discardDraftDescription')}
        actions={
          <Button variant="unstyled"
            className="button button-danger"
            type="button"
            disabled={discarding}
            onClick={() => void discardDraft()}
          >
            <Trash2 aria-hidden="true" />
            {discarding ? __t('onboarding.discardingDraft') : __t('onboarding.confirmDiscardDraft')}
          </Button>
        }
      >
        <p className="admin-message">{__t('onboarding.discardDraftServerNotice')}</p>
      </Modal>
    </div>
  );
}

function Title({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="card-heading">
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}
function Identity({
  draft,
  update,
}: {
  draft: OnboardingDraft;
  update: (key: keyof OnboardingDraft['site'], value: unknown) => void;
}) {
  const { t: __t } = useTranslation();
  const s = draft.site;
  return (
    <section>
      <Title
        title={__t('onboarding.onboarding.identiteDuSite')}
        text={__t('onboarding.siteIdentityHelp')}
      />
      <div className="form-grid">
        <label>
          {__t('onboarding.onboarding.nomDuSite')}
          <input
            required
            maxLength={100}
            disabled={Boolean(draft.confirmedSiteId)}
            value={s.siteName}
            onChange={(e) => {
              update('siteName', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('common.type')}
          <select
            value={s.siteType}
            onChange={(e) => {
              update('siteType', e.target.value);
            }}
          >
            <option value="public">{__t('onboarding.onboarding.public')}</option>
            <option value="private">{__t('onboarding.onboarding.prive')}</option>
          </select>
        </label>
        <label>
          {__t('common.localisation')}
          <input
            maxLength={255}
            value={s.siteLocation ?? ''}
            onChange={(e) => {
              update('siteLocation', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('onboarding.onboarding.urlDuLogo')}
          <input
            type="url"
            value={s.siteLogoUrl ?? ''}
            onChange={(e) => {
              update('siteLogoUrl', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('onboarding.onboarding.fuseauIana')}
          <select
            value={s.timezone}
            onChange={(e) => {
              update('timezone', e.target.value);
            }}
          >
            <option>{__t('onboarding.onboarding.africaTunis')}</option>
            <option>{__t('common.europeParis')}</option>
            <option>{__t('onboarding.onboarding.africaCasablanca')}</option>
          </select>
        </label>
        <label>
          {__t('common.locale')}
          <select
            value={s.defaultLocale}
            onChange={(e) => {
              update('defaultLocale', e.target.value);
            }}
          >
            <option>{__t('common.fr')}</option>
            <option>{__t('common.ar')}</option>
            <option>{__t('common.en')}</option>
          </select>
        </label>
      </div>
    </section>
  );
}
function Defaults({
  draft,
  update,
}: {
  draft: OnboardingDraft;
  update: (key: keyof OnboardingDraft['site'], value: unknown) => void;
}) {
  const { t: __t } = useTranslation();
  const s = draft.site;
  const n = (key: keyof OnboardingDraft['site'], value: string) => {
    update(key, Number(value));
  };
  return (
    <section>
      <Title
        title={__t('onboarding.onboarding.defaultsOperationnelsDuSite')}
        text={__t('onboarding.defaultsHelp')}
      />
      <div className="form-grid">
        <label>
          {__t('common.devise')}
          <select
            value={s.defaultCurrency}
            onChange={(e) => {
              update('defaultCurrency', e.target.value);
            }}
          >
            <option>{__t('common.tnd')}</option>
            <option>{__t('common.eur')}</option>
            <option>{__t('common.usd')}</option>
          </select>
        </label>
        <label>
          {__t('onboarding.onboarding.dureeCreneau')}
          <input
            type="number"
            min="1"
            value={s.defaultAppointmentSlotDuration}
            onChange={(e) => {
              n('defaultAppointmentSlotDuration', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('common.capacite')}
          <input
            type="number"
            min="1"
            value={s.defaultSlotCapacity}
            onChange={(e) => {
              n('defaultSlotCapacity', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('common.toleranceRetard')}
          <input
            type="number"
            min="0"
            value={s.defaultLateToleranceMinutes}
            onChange={(e) => {
              n('defaultLateToleranceMinutes', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('common.ouverture')}
          <input
            type="time"
            value={s.defaultWorkingHoursStart}
            onChange={(e) => {
              update('defaultWorkingHoursStart', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('common.fermeture')}
          <input
            type="time"
            value={s.defaultWorkingHoursEnd}
            onChange={(e) => {
              update('defaultWorkingHoursEnd', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('onboarding.onboarding.debutInterruption')}
          <input
            type="time"
            value={s.defaultBreakStart}
            onChange={(e) => {
              update('defaultBreakStart', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('onboarding.onboarding.finInterruption')}
          <input
            type="time"
            value={s.defaultBreakEnd}
            onChange={(e) => {
              update('defaultBreakEnd', e.target.value);
            }}
          />
        </label>
      </div>
      <label className="check-row">
        <span>
          <b>{__t('onboarding.onboarding.rendezVousActivesParDefaut')}</b>
          <small>{__t('onboarding.onboarding.heriteParLesFiles')}</small>
        </span>
        <input
          type="checkbox"
          checked={s.defaultAppointmentsEnabled}
          onChange={(e) => {
            update('defaultAppointmentsEnabled', e.target.checked);
          }}
        />
      </label>
      <label className="check-row">
        <span>
          <b>{__t('onboarding.onboarding.reporterLAttenteAuLendemain')}</b>
        </span>
        <input
          type="checkbox"
          checked={s.defaultCarryOverWaiting}
          onChange={(e) => {
            update('defaultCarryOverWaiting', e.target.checked);
          }}
        />
      </label>
    </section>
  );
}
function QueuesStep({
  draft,
  open,
  edit,
}: {
  draft: OnboardingDraft;
  open: () => void;
  edit: (queueCode: string) => void;
}) {
  const { t: __t } = useTranslation();
  return (
    <section>
      <Title
        title={__t('onboarding.onboarding.filesGuichets')}
        text={__t('onboarding.queueOverrideHelp')}
        action={
          <Button variant="unstyled" type="submit" className="button button-primary" onClick={open}>
            {__t('onboarding.onboarding.ajouterUneFile')}
          </Button>
        }
      />
      <div className="inheritance-note">
        <b>{__t('onboarding.onboarding.principeDHeritage')}</b>
        <p>{__t('onboarding.onboarding.uneValeurAbsenteOuRemiseAHeriterUtiliseL')}</p>
      </div>
      <div className="table-wrap admin-table-wrap onboarding-queue-table">
        <table>
          <thead>
            <tr>
              <th>{__t('onboarding.onboarding.code')}</th>
              <th>{__t('common.name')}</th>
              <th>{__t('common.guichets')}</th>
              <th>{__t('common.rdv')}</th>
              <th>{__t('common.devise')}</th>
              <th>{__t('common.api')}</th>
              <th className="table-action-column">{__t('onboarding.queueActions')}</th>
            </tr>
          </thead>
          <tbody>
            {draft.queues.map((q) => (
              <tr key={q.queueCode}>
                <td>
                  <b>{q.queueCode}</b>
                </td>
                <td>{q.queueName || '—'}</td>
                <td>{q.threadCount ?? 1}</td>
                <td>
                  {q.appointmentsEnabled === undefined
                    ? __t('onboarding.onboarding.herite')
                    : q.appointmentsEnabled
                      ? __t('common.actives')
                      : __t('common.desactives')}
                </td>
                <td>{q.currency || __t('common.heritee')}</td>
                <td>
                  <span
                    className={`status-badge ${draft.confirmedQueueIds[q.queueCode] ? 'status-success' : ''}`}
                  >
                    {draft.confirmedQueueIds[q.queueCode]
                      ? __t('onboarding.onboarding.confirmee')
                      : __t('onboarding.onboarding.brouillon')}
                  </span>
                </td>
                <td className="table-action-column">
                  <Button variant="unstyled"
                    type="button"
                    className="button button-small"
                    aria-label={__t('onboarding.editQueueLabel', {
                      queue: q.queueName || q.queueCode,
                    })}
                    onClick={() => {
                      edit(q.queueCode);
                    }}
                  >
                    {__t('onboarding.editQueue')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function TiersStep({
  fixed,
  loading,
  draft,
  save,
}: {
  fixed: { tierId: number; tierCode: string; tierName: string; description?: string }[];
  loading: boolean;
  draft: OnboardingDraft;
  save: (value: OnboardingDraft) => void;
}) {
  const { t: __t } = useTranslation();
  const queues = Object.entries(draft.confirmedQueueIds);
  const defaultConfiguration = (
    displayOrder: number,
    isDefault: boolean,
  ): OnboardingTierConfiguration => ({
    price: 0,
    currency: '',
    isDefault,
    displayOrder,
    welcomeSms: false,
    welcomeEmail: false,
    alertSms: false,
    alertThresholdType: 'position',
    alertPosition: 3,
    includeTrackingLink: true,
  });
  const toggle = (queueId: number, tierId: number) => {
    const key = String(queueId);
    const tierKey = String(tierId);
    const selected = draft.selectedTierIds[key] ?? [];
    const removing = selected.includes(tierId);
    const nextSelected = removing
      ? selected.filter((current) => current !== tierId)
      : [...selected, tierId];
    const currentConfigurations = Object.fromEntries(
      Object.entries(draft.tierConfigurations[key] ?? {}).filter(
        ([configurationKey]) => !removing || configurationKey !== tierKey,
      ),
    );
    if (!removing)
      currentConfigurations[tierKey] = defaultConfiguration(
        nextSelected.length,
        selected.length === 0,
      );

    const hasDefault = nextSelected.some(
      (current) => currentConfigurations[String(current)]?.isDefault,
    );
    const nextConfigurations = Object.fromEntries(
      nextSelected.map((current, index) => {
        const currentKey = String(current);
        const configuration =
          currentConfigurations[currentKey] ?? defaultConfiguration(index + 1, index === 0);
        return [
          currentKey,
          {
            ...configuration,
            displayOrder: index + 1,
            isDefault: hasDefault ? configuration.isDefault : index === 0,
          },
        ];
      }),
    );
    save({
      ...draft,
      selectedTierIds: { ...draft.selectedTierIds, [key]: nextSelected },
      tierConfigurations: { ...draft.tierConfigurations, [key]: nextConfigurations },
    });
  };
  const configure = (
    queueId: number,
    tierId: number,
    patch: Partial<OnboardingDraft['tierConfigurations'][string][string]>,
  ) => {
    const queueKey = String(queueId);
    const tierKey = String(tierId);
    const selected = draft.selectedTierIds[queueKey] ?? [];
    const currentConfigurations = { ...(draft.tierConfigurations[queueKey] ?? {}) };
    const current =
      currentConfigurations[tierKey] ??
      defaultConfiguration(selected.indexOf(tierId) + 1, selected[0] === tierId);
    if (patch.isDefault) {
      selected.forEach((selectedTierId) => {
        const selectedKey = String(selectedTierId);
        const configuration =
          currentConfigurations[selectedKey] ??
          defaultConfiguration(selected.indexOf(selectedTierId) + 1, false);
        currentConfigurations[selectedKey] = { ...configuration, isDefault: false };
      });
    }
    currentConfigurations[tierKey] = { ...current, ...patch };
    save({
      ...draft,
      tierConfigurations: {
        ...draft.tierConfigurations,
        [queueKey]: currentConfigurations,
      },
    });
  };
  return (
    <section>
      <Title title={__t('common.niveauxDeService')} text={__t('onboarding.tiersHelp')} />
      {loading ? <p>{__t('onboarding.onboarding.chargementDuCatalogue')}</p> : null}
      {fixed.length === 0 && !loading ? (
        <p className="admin-message" role="alert">
          {__t('onboarding.onboarding.aucunNiveauGratuitStandardOuPremiumActifN')}
        </p>
      ) : null}
      {queues.map(([queueCode, queueId]) => {
        const queueKey = String(queueId);
        const selected = draft.selectedTierIds[queueKey] ?? [];
        return (
          <div className="tier-queue-section" key={queueId}>
            <div className="card-heading">
              <div>
                <h3>{queueCode}</h3>
                <p>{__t('onboarding.selectedServices', { count: selected.length })}</p>
              </div>
              <span
                className={`status-badge ${selected.length ? 'status-success' : 'status-warning'}`}
              >
                {selected.length
                  ? __t('onboarding.onboarding.configurationPrete')
                  : __t('onboarding.onboarding.selectionRequise')}
              </span>
            </div>
            <div className="tier-card-grid">
              {fixed.map((tier) => {
                const isSelected = selected.includes(tier.tierId);
                const configuration =
                  draft.tierConfigurations[queueKey]?.[String(tier.tierId)] ??
                  defaultConfiguration(
                    selected.indexOf(tier.tierId) + 1,
                    selected[0] === tier.tierId,
                  );
                const notificationsEnabled =
                  configuration.welcomeSms || configuration.welcomeEmail || configuration.alertSms;
                return (
                  <article
                    className={`station tier-config-card ${isSelected ? 'selected' : ''}`}
                    key={tier.tierId}
                  >
                    <Button variant="unstyled"
                      type="button"
                      className="tier-choice tier-choice-toggle"
                      aria-pressed={isSelected}
                      onClick={() => {
                        toggle(queueId, tier.tierId);
                      }}
                    >
                      <span className={`status-badge ${isSelected ? 'status-success' : ''}`}>
                        {isSelected
                          ? __t('onboarding.serviceEnabled')
                          : __t('onboarding.enableService')}
                      </span>
                      <span className={`service-tier-label ${serviceTierVisualClass(tier.tierId, tier.tierCode || tier.tierName)}`}>
                        <strong>{tier.tierName}</strong>
                        <small>{tier.description || tier.tierCode}</small>
                      </span>
                    </Button>
                    {isSelected ? (
                      <div className="tier-inline-config">
                        <div className="tier-config-grid">
                          <label>
                            <span>{__t('onboarding.servicePrice')}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={configuration.price}
                              onChange={(event) => {
                                configure(queueId, tier.tierId, {
                                  price: Math.max(0, Number(event.target.value) || 0),
                                });
                              }}
                            />
                          </label>
                          <label>
                            <span>{__t('onboarding.serviceCurrency')}</span>
                            <select
                              value={configuration.currency}
                              onChange={(event) => {
                                configure(queueId, tier.tierId, { currency: event.target.value });
                              }}
                            >
                              <option value="">{draft.site.defaultCurrency}</option>
                              {[draft.site.defaultCurrency, 'TND', 'EUR', 'USD']
                                .filter(
                                  (currency, index, values) =>
                                    currency && values.indexOf(currency) === index,
                                )
                                .map((currency) => (
                                  <option value={currency} key={currency}>
                                    {currency}
                                  </option>
                                ))}
                            </select>
                          </label>
                        </div>
                        <label className="tier-default-option">
                          <input
                            type="radio"
                            name={`default-tier-${String(queueId)}`}
                            checked={configuration.isDefault}
                            onChange={() => {
                              configure(queueId, tier.tierId, { isDefault: true });
                            }}
                          />
                          <span>
                            <strong>{__t('onboarding.defaultService')}</strong>
                          </span>
                        </label>
                        <fieldset className="tier-options-fieldset">
                          <legend>{__t('onboarding.serviceOptions')}</legend>
                          <label>
                            <input
                              type="checkbox"
                              checked={configuration.welcomeSms}
                              onChange={(event) => {
                                configure(queueId, tier.tierId, {
                                  welcomeSms: event.target.checked,
                                });
                              }}
                            />
                            <span>{__t('onboarding.welcomeSms')}</span>
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={configuration.welcomeEmail}
                              onChange={(event) => {
                                configure(queueId, tier.tierId, {
                                  welcomeEmail: event.target.checked,
                                });
                              }}
                            />
                            <span>{__t('onboarding.welcomeEmail')}</span>
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={configuration.alertSms}
                              onChange={(event) => {
                                configure(queueId, tier.tierId, { alertSms: event.target.checked });
                              }}
                            />
                            <span>{__t('onboarding.approachSms')}</span>
                          </label>
                          {configuration.alertSms ? (
                            <div className="tier-threshold-config">
                              <label className="tier-threshold-field">
                                <span>{__t('onboarding.alertThresholdType')}</span>
                                <select
                                  value={configuration.alertThresholdType}
                                  onChange={(event) => {
                                    configure(queueId, tier.tierId, {
                                      alertThresholdType: event.target.value as
                                        'position' | 'estimatedTime',
                                    });
                                  }}
                                >
                                  <option value="position">
                                    {__t('onboarding.thresholdByPosition')}
                                  </option>
                                  <option value="estimatedTime">
                                    {__t('onboarding.thresholdByTime')}
                                  </option>
                                </select>
                              </label>
                              <label className="tier-threshold-field">
                                <span>
                                  {__t(
                                    configuration.alertThresholdType === 'position'
                                      ? 'onboarding.alertPosition'
                                      : 'onboarding.alertMinutes',
                                  )}
                                </span>
                                <input
                                  type="number"
                                  min="1"
                                  max="99"
                                  value={configuration.alertPosition}
                                  onChange={(event) => {
                                    configure(queueId, tier.tierId, {
                                      alertPosition: Math.max(1, Number(event.target.value) || 1),
                                    });
                                  }}
                                />
                              </label>
                            </div>
                          ) : null}
                          <label className={!notificationsEnabled ? 'is-disabled' : ''}>
                            <input
                              type="checkbox"
                              checked={configuration.includeTrackingLink}
                              disabled={!notificationsEnabled}
                              onChange={(event) => {
                                configure(queueId, tier.tierId, {
                                  includeTrackingLink: event.target.checked,
                                });
                              }}
                            />
                            <span>{__t('onboarding.trackingLink')}</span>
                          </label>
                        </fieldset>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
function TeamStep() {
  const { t: __t } = useTranslation();
  return (
    <section>
      <Title
        title={__t('onboarding.onboarding.equipeAppareils')}
        text={__t('onboarding.accountsHelp')}
      />
      <div className="empty-admin-state">
        <span className="ticket-chip">5</span>
        <h3>{__t('onboarding.onboarding.assistantDeComptesPartage')}</h3>
        <p>{__t('onboarding.onboarding.creezLeRoleInitialPuisAffectezLesSitesEt')}</p>
        <a className="button button-primary" href="/settings/users">
          {__t('onboarding.onboarding.ouvrirLesUtilisateurs')}
        </a>
      </div>
    </section>
  );
}
function ReviewStep({
  draft,
  save,
}: {
  draft: OnboardingDraft;
  save: (value: OnboardingDraft) => void;
}) {
  const { t: __t } = useTranslation();
  const checks = [
    ['onboarding.review.siteAndDefaults', Boolean(draft.confirmedSiteId)],
    ['onboarding.review.queuesAndCounters', Object.keys(draft.confirmedQueueIds).length > 0],
    ['onboarding.review.tiersAssociated', draft.associatedTierQueueIds.length > 0],
  ] as const;
  return (
    <section>
      <Title
        title={__t('onboarding.onboarding.recetteActivation')}
        text={__t('onboarding.validationHelp')}
      />
      {checks.map(([label, done]) => (
        <div className="check-row" key={label}>
          <b>{__t(label)}</b>
          <span className={`status-badge ${done ? 'status-success' : 'status-warning'}`}>
            {done ? __t('common.valide') : __t('onboarding.onboarding.aFaire')}
          </span>
        </div>
      ))}
      <div className="check-row">
        <div>
          <b>{__t('onboarding.onboarding.testDAppelComplet')}</b>
          <p>{__t('onboarding.onboarding.occuperUnGuichetAppelerPuisServir')}</p>
        </div>
        {draft.testValidated ? (
          <span className="status-badge status-success">{__t('common.valide')}</span>
        ) : (
          <Button variant="unstyled" type="submit"
            className="button"
            onClick={() => {
              save({ ...draft, testValidated: true });
            }}
          >
            {__t('onboarding.onboarding.lancerLeTest')}
          </Button>
        )}
      </div>
    </section>
  );
}
