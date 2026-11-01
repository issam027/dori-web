
import { Identity } from './onboarding/Identity';
import { Defaults } from './onboarding/Defaults';
import { QueuesStep } from './onboarding/QueuesStep';
import { TiersStep } from './onboarding/TiersStep';
import { TeamStep } from './onboarding/TeamStep';
import { ReviewStep } from './onboarding/ReviewStep';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Trash2 } from 'lucide-react';
import {
  associateTier,
  createQueueForSite,
  createSite,
  createTierRule,
  deleteSite,
  findTiers,
  getQueueTiers,
  updateQueueTier,
  removeQueue,
  updateQueue,
  updateSite,
} from '../api/onboarding-api';
import type { CreateQueueDto } from '@/api/generated/models';
import { Card } from '@/design-system/components/Card';
import { Modal } from '@/design-system/components/Modal';
import { PageHeader } from '@/design-system/components/PageHeader';
import { QueueEditor } from '@/features/queues/public';
import { loadOnboardingDraft, clearOnboardingDraft, initialOnboardingDraft, queueNeedsCreation, saveOnboardingDraft, type OnboardingDraft } from '../model/onboarding-draft';
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
import { ResponsiveDetails } from '@/design-system/components/ResponsiveDetails';

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
            (draft.selectedTierIds[queueId] ?? []).includes(tier.tierId),
          );
          if (selected.length === 0) throw new Error(__t('onboarding.errors.tierRequiredPerQueue'));
          for (const [index, tier] of selected.entries()) {
            const configuration = draft.tierConfigurations[queueId]?.[tier.tierId];
            await associateTier(queueId, {
              tierId: tier.tierId,
              price: configuration?.price ?? 0,
              currency: configuration?.currency || null,
              displayOrder: configuration?.displayOrder ?? index + 1,
              isDefault: configuration?.isDefault ?? false,
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
          // Queue creation initially enables the free tier as default. Respect an
          // explicit "none" choice even if that tier was not selected in this step.
          if (
            !selected.some((tier) => draft.tierConfigurations[queueId]?.[tier.tierId]?.isDefault)
          ) {
            const current = await getQueueTiers(queueId, { page: 1, pageSize: 100 });
            for (const item of current.data.items.filter(
              (item) => item.isActive && item.isDefault,
            )) {
              await updateQueueTier(queueId, item.tierId, { isDefault: false });
            }
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
        setEditingQueueCode(undefined);
        setQueueOpen(false);
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
      setMessage(__t('onboarding.onboarding.etapeEnregistreeAvecSucces'));
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
        status={
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
            <Button
              variant="unstyled"
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
          <ResponsiveDetails
            summary={`${String(draft.step)} / ${String(stepKeys.length)} · ${__t(stepKeys[draft.step - 1] ?? stepKeys[0])}`}
          >
            <h2>{__t('onboarding.onboarding.parcoursDeConfiguration')}</h2>
            {stepKeys.map((key, index) => (
              <Button
                variant="unstyled"
                type="submit"
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
          </ResponsiveDetails>
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
            <Button
              variant="unstyled"
              type="submit"
              className="button"
              disabled={draft.step === 1 || busy}
              onClick={() => {
                save(moveToPreviousOnboardingStep(draft));
              }}
            >
              <ArrowLeft aria-hidden="true" />
              {__t('onboarding.onboarding.precedent')}
            </Button>
            <div>
              <Button
                variant="unstyled"
                type="submit"
                className="button"
                onClick={() => {
                  saveOnboardingDraft(draft);
                }}
              >
                {__t('onboarding.onboarding.enregistrerLeBrouillon')}
              </Button>
              <Button
                variant="unstyled"
                type="submit"
                className="button button-primary"
                disabled={busy || !canAdvanceOnboarding(draft, fixed.length)}
                onClick={() => void next()}
              >
                {draft.step === 6
                  ? __t('onboarding.onboarding.activerLeSite')
                  : __t('onboarding.onboarding.enregistrerEtContinuer')}
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
          <Button
            variant="unstyled"
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
