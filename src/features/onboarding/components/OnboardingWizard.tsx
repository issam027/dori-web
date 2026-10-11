import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import {
  loadOnboardingDraft,
  clearOnboardingDraft,
  initialOnboardingDraft,
  queueNeedsCreation,
  saveOnboardingDraft,
  type OnboardingDraft,
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

const steps = [
  'Identité du site',
  'Paramètres',
  'Files & guichets',
  'Niveaux de service',
  'Équipe & appareils',
  'Recette & activation',
];

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
        if (!draft.site.siteName.trim()) throw new Error('Le nom du site est requis.');
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
          if (selected.length === 0)
            throw new Error('Sélectionnez au moins un niveau pour chaque file.');
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
                thresholdType: 'position',
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
          __t(
            'ui.expression.onboarding.onboarding_page.le_site_value0_est_maintenant_actif_la_confi_i2kxg7',
            { value0: activatedSite },
          ),
        );
        return;
      }
      value.step = Math.min(6, draft.step + 1);
      save(value);
      setMessage(
        __t('ui.expression.onboarding.onboarding_page.etape_enregistree_avec_succes_1ngds6l'),
      );
    } catch (error) {
      notifyError(error);
      setMessage(error instanceof Error ? error.message : 'Erreur. Relancez cette étape.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-stack admin-page">
      <PageHeader
        eyebrow="Administration guidée"
        title={__t('ui.onboarding.onboarding_page.configurer_un_nouveau_site_se1lly')}
        description={__t(
          'ui.onboarding.onboarding_page.une_configuration_progressive_enregistree_a_chaq_1a6adol',
        )}
        actions={
          <span className="status-badge status-info">
            {__t('ui.onboarding.onboarding_page.etape_1mygumc')}
            {draft.step} {__t('ui.onboarding.onboarding_page.sur_6_13lm64r')}
          </span>
        }
      />
      {draft.confirmedSiteId ? (
        <Card className="resume-card">
          <div>
            <b>
              {__t('ui.onboarding.onboarding_page.configuration_reprise_automatiquement_1omvb9k')}
            </b>
            <p>
              {__t('ui.onboarding.onboarding_page.site_olnjkb')}
              {draft.confirmedSiteId} {__t('ui.onboarding.onboarding_page.confirme_1l0a5sj')}
              {Object.keys(draft.confirmedQueueIds).length}{' '}
              {__t('ui.onboarding.onboarding_page.file_s_confirmee_s_tysem1')}
            </p>
          </div>
          <div className="resume-card-actions">
            <span className="status-badge status-success">
              {__t('ui.onboarding.onboarding_page.brouillon_local_13vfu7e')}
            </span>
            <button
              className="button button-danger button-small"
              type="button"
              disabled={discarding}
              onClick={() => {
                setDiscardOpen(true);
              }}
            >
              {__t('onboarding.discardDraft')}
            </button>
          </div>
        </Card>
      ) : null}
      <div className="onboarding-layout">
        <Card className="setup-navigation">
          <h2>{__t('ui.onboarding.onboarding_page.parcours_de_configuration_ho7ct7')}</h2>
          {steps.map((label, index) => (
            <button
              key={label}
              className={`setup-nav-row ${draft.step === index + 1 ? 'active' : ''}`}
              disabled={index + 1 > draft.step}
              onClick={() => {
                save({ ...draft, step: index + 1 });
              }}
            >
              <span className="ticket-chip">{index + 1}</span>
              <span>
                <b>{label}</b>
              </span>
              {index + 1 < draft.step ? (
                <span className="status-badge status-success">
                  {__t('ui.onboarding.onboarding_page.termine_1osoj4f')}
                </span>
              ) : null}
            </button>
          ))}
        </Card>
        <Card className="setup-content">
          <div className="setup-progress">
            {steps.map((_, index) => (
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
            <button
              className="button"
              disabled={draft.step === 1 || busy}
              onClick={() => {
                save(moveToPreviousOnboardingStep(draft));
              }}
            >
              {__t('ui.onboarding.onboarding_page.precedent_1jxxpxn')}
            </button>
            <div>
              <button
                className="button"
                onClick={() => {
                  saveOnboardingDraft(draft);
                }}
              >
                {__t('ui.onboarding.onboarding_page.enregistrer_le_brouillon_l3dxt2')}
              </button>
              <button
                className="button button-primary"
                disabled={busy || !canAdvanceOnboarding(draft, fixed.length)}
                onClick={() => void next()}
              >
                {draft.step === 6
                  ? __t('ui.expression.onboarding.onboarding_page.activer_le_site_o1qxct')
                  : __t('ui.expression.onboarding.onboarding_page.enregistrer_et_continuer_86kufl')}
              </button>
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
          <>
            <button
              className="button"
              type="button"
              disabled={discarding}
              onClick={() => {
                setDiscardOpen(false);
              }}
            >
              {__t('common.cancel')}
            </button>
            <button
              className="button button-danger"
              type="button"
              disabled={discarding}
              onClick={() => void discardDraft()}
            >
              {discarding
                ? __t('onboarding.discardingDraft')
                : __t('onboarding.confirmDiscardDraft')}
            </button>
          </>
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
        title={__t('ui.onboarding.onboarding_page.identite_du_site_zo71q1')}
        text={__t('onboarding.siteIdentityHelp')}
      />
      <div className="form-grid">
        <label>
          {__t('ui.onboarding.onboarding_page.nom_du_site_8jydmt')}
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
          {__t('ui.onboarding.onboarding_page.type_1m2zofh')}
          <select
            value={s.siteType}
            onChange={(e) => {
              update('siteType', e.target.value);
            }}
          >
            <option value="public">{__t('ui.onboarding.onboarding_page.public_1kufgkg')}</option>
            <option value="private">{__t('ui.onboarding.onboarding_page.prive_wl0j0n')}</option>
          </select>
        </label>
        <label>
          {__t('ui.onboarding.onboarding_page.localisation_17ojrsd')}
          <input
            maxLength={255}
            value={s.siteLocation ?? ''}
            onChange={(e) => {
              update('siteLocation', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('ui.onboarding.onboarding_page.url_du_logo_c2wc60')}
          <input
            type="url"
            value={s.siteLogoUrl ?? ''}
            onChange={(e) => {
              update('siteLogoUrl', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('ui.onboarding.onboarding_page.fuseau_iana_1oq0ubh')}
          <select
            value={s.timezone}
            onChange={(e) => {
              update('timezone', e.target.value);
            }}
          >
            <option>{__t('ui.onboarding.onboarding_page.africa_tunis_19dhj3f')}</option>
            <option>{__t('ui.onboarding.onboarding_page.europe_paris_uijlvz')}</option>
            <option>{__t('ui.onboarding.onboarding_page.africa_casablanca_17mzro5')}</option>
          </select>
        </label>
        <label>
          {__t('ui.onboarding.onboarding_page.locale_1pfta5z')}
          <select
            value={s.defaultLocale}
            onChange={(e) => {
              update('defaultLocale', e.target.value);
            }}
          >
            <option>{__t('ui.onboarding.onboarding_page.fr_o6dm29')}</option>
            <option>{__t('ui.onboarding.onboarding_page.ar_puedq2')}</option>
            <option>{__t('ui.onboarding.onboarding_page.en_i2aop6')}</option>
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
        title={__t('ui.onboarding.onboarding_page.defaults_operationnels_du_site_14zcjwg')}
        text={__t('onboarding.defaultsHelp')}
      />
      <div className="form-grid">
        <label>
          {__t('ui.onboarding.onboarding_page.devise_1pl1r6r')}
          <select
            value={s.defaultCurrency}
            onChange={(e) => {
              update('defaultCurrency', e.target.value);
            }}
          >
            <option>{__t('ui.onboarding.onboarding_page.tnd_gge1jd')}</option>
            <option>{__t('ui.onboarding.onboarding_page.eur_1i746uf')}</option>
            <option>{__t('ui.onboarding.onboarding_page.usd_174gkvb')}</option>
          </select>
        </label>
        <label>
          {__t('ui.onboarding.onboarding_page.duree_creneau_m06yzt')}
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
          {__t('ui.onboarding.onboarding_page.capacite_1nhjc3d')}
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
          {__t('ui.onboarding.onboarding_page.tolerance_retard_gttjc8')}
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
          {__t('ui.onboarding.onboarding_page.ouverture_pawjjg')}
          <input
            type="time"
            value={s.defaultWorkingHoursStart}
            onChange={(e) => {
              update('defaultWorkingHoursStart', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('ui.onboarding.onboarding_page.fermeture_46skya')}
          <input
            type="time"
            value={s.defaultWorkingHoursEnd}
            onChange={(e) => {
              update('defaultWorkingHoursEnd', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('ui.onboarding.onboarding_page.debut_interruption_p6tydw')}
          <input
            type="time"
            value={s.defaultBreakStart}
            onChange={(e) => {
              update('defaultBreakStart', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('ui.onboarding.onboarding_page.fin_interruption_rvpfsx')}
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
          <b>{__t('ui.onboarding.onboarding_page.rendez_vous_actives_par_defaut_1hj9c46')}</b>
          <small>{__t('ui.onboarding.onboarding_page.herite_par_les_files_3hg7nw')}</small>
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
          <b>{__t('ui.onboarding.onboarding_page.reporter_l_attente_au_lendemain_fz0gel')}</b>
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
        title={__t('ui.onboarding.onboarding_page.files_guichets_ez0b9k')}
        text={__t('onboarding.queueOverrideHelp')}
        action={
          <button className="button button-primary" onClick={open}>
            {__t('ui.onboarding.onboarding_page.ajouter_une_file_1m9v20c')}
          </button>
        }
      />
      <div className="inheritance-note">
        <b>{__t('ui.onboarding.onboarding_page.principe_d_heritage_fss2wz')}</b>
        <p>
          {__t(
            'ui.onboarding.onboarding_page.une_valeur_absente_ou_remise_a_heriter_utilise_l_w8z1c5',
          )}
        </p>
      </div>
      <div className="table-wrap admin-table-wrap onboarding-queue-table">
        <table>
          <thead>
            <tr>
              <th>{__t('ui.onboarding.onboarding_page.code_xoaiok')}</th>
              <th>{__t('ui.onboarding.onboarding_page.nom_15eqct1')}</th>
              <th>{__t('ui.onboarding.onboarding_page.guichets_j0id8z')}</th>
              <th>{__t('ui.onboarding.onboarding_page.rdv_1f03hpr')}</th>
              <th>{__t('ui.onboarding.onboarding_page.devise_1pl1r6r')}</th>
              <th>{__t('ui.onboarding.onboarding_page.api_y14yjr')}</th>
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
                    ? __t('ui.expression.onboarding.onboarding_page.herite_604lqs')
                    : q.appointmentsEnabled
                      ? __t('ui.expression.onboarding.onboarding_page.actives_1ntg7nc')
                      : __t('ui.expression.onboarding.onboarding_page.desactives_1jqymmi')}
                </td>
                <td>
                  {q.currency || __t('ui.expression.onboarding.onboarding_page.heritee_zqggrn')}
                </td>
                <td>
                  <span
                    className={`status-badge ${draft.confirmedQueueIds[q.queueCode] ? 'status-success' : ''}`}
                  >
                    {draft.confirmedQueueIds[q.queueCode]
                      ? __t('ui.expression.onboarding.onboarding_page.confirmee_b2ivxx')
                      : __t('ui.expression.onboarding.onboarding_page.brouillon_107uxdl')}
                  </span>
                </td>
                <td className="table-action-column">
                  <button
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
                  </button>
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
  const defaultConfiguration = (displayOrder: number, isDefault: boolean) => ({
    price: 0,
    currency: '',
    isDefault,
    displayOrder,
    welcomeSms: false,
    welcomeEmail: false,
    alertSms: false,
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
      <Title
        title={__t('ui.onboarding.onboarding_page.niveaux_de_service_1yfgjsz')}
        text={__t('onboarding.tiersHelp')}
      />
      {loading ? (
        <p>{__t('ui.onboarding.onboarding_page.chargement_du_catalogue_jb8lrx')}</p>
      ) : null}
      {fixed.length === 0 && !loading ? (
        <p className="admin-message" role="alert">
          {__t(
            'ui.onboarding.onboarding_page.aucun_niveau_gratuit_standard_ou_premium_actif_n_1ezzg3u',
          )}
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
                  ? __t('ui.onboarding.onboarding_page.configuration_prete_zm42va')
                  : __t('ui.onboarding.onboarding_page.selection_requise_10mlh1n')}
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
                    <button
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
                      <span>
                        <strong>{tier.tierName}</strong>
                        <small>{tier.description || tier.tierCode}</small>
                      </span>
                    </button>
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
                              <option value="">
                                {__t('onboarding.inheritedCurrency', {
                                  currency: draft.site.defaultCurrency,
                                })}
                              </option>
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
                            <small>{__t('onboarding.defaultServiceHint')}</small>
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
                            <label className="tier-threshold-field">
                              <span>{__t('onboarding.alertPosition')}</span>
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
        title={__t('ui.onboarding.onboarding_page.equipe_appareils_1to6dbn')}
        text={__t('onboarding.accountsHelp')}
      />
      <div className="empty-admin-state">
        <span className="ticket-chip">5</span>
        <h3>{__t('ui.onboarding.onboarding_page.assistant_de_comptes_partage_1xm12zj')}</h3>
        <p>
          {__t(
            'ui.onboarding.onboarding_page.creez_le_role_initial_puis_affectez_les_sites_et_1atzy25',
          )}
        </p>
        <a className="button button-primary" href="/settings/users">
          {__t('ui.onboarding.onboarding_page.ouvrir_les_utilisateurs_1075h32')}
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
    ['Site et paramètres', Boolean(draft.confirmedSiteId)],
    ['Files et guichets', Object.keys(draft.confirmedQueueIds).length > 0],
    ['Niveaux associés', draft.associatedTierQueueIds.length > 0],
  ] as const;
  return (
    <section>
      <Title
        title={__t('ui.onboarding.onboarding_page.recette_activation_g8mgcf')}
        text={__t('onboarding.validationHelp')}
      />
      {checks.map(([label, done]) => (
        <div className="check-row" key={label}>
          <b>{label}</b>
          <span className={`status-badge ${done ? 'status-success' : 'status-warning'}`}>
            {done
              ? __t('ui.expression.onboarding.onboarding_page.valide_cy7xbc')
              : __t('ui.expression.onboarding.onboarding_page.a_faire_ds4uh6')}
          </span>
        </div>
      ))}
      <div className="check-row">
        <div>
          <b>{__t('ui.onboarding.onboarding_page.test_d_appel_complet_jj4cr6')}</b>
          <p>
            {__t('ui.onboarding.onboarding_page.occuper_un_guichet_appeler_puis_servir_rwhdmf')}
          </p>
        </div>
        {draft.testValidated ? (
          <span className="status-badge status-success">
            {__t('ui.onboarding.onboarding_page.valide_cy7xbc')}
          </span>
        ) : (
          <button
            className="button"
            onClick={() => {
              save({ ...draft, testValidated: true });
            }}
          >
            {__t('ui.onboarding.onboarding_page.lancer_le_test_1isdfon')}
          </button>
        )}
      </div>
    </section>
  );
}
