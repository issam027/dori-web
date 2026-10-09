import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queuesControllerCreateForSite } from '@/api/generated/queues/queues';
import { sitesControllerCreateSite, sitesControllerUpdateSite } from '@/api/generated/sites/sites';
import {
  serviceTiersControllerAssociateTier,
  serviceTiersControllerFindTiers,
} from '@/api/generated/tiers/tiers';
import type { CreateQueueDto } from '@/api/generated/models';
import { Card } from '@/design-system/components/Card';
import { PageHeader } from '@/design-system/components/PageHeader';
import { QueueEditor } from '@/features/queues/QueueEditor';
import {
  loadOnboardingDraft,
  clearOnboardingDraft,
  initialOnboardingDraft,
  queueNeedsCreation,
  saveOnboardingDraft,
  type OnboardingDraft,
} from './onboarding-draft';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';

const steps = [
  'Identité du site',
  'Paramètres',
  'Files & guichets',
  'Niveaux de service',
  'Équipe & appareils',
  'Recette & activation',
];

export function OnboardingPage() {
  const [draft, setState] = useState<OnboardingDraft>(() => loadOnboardingDraft());
  const [queueOpen, setQueueOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const tiers = useQuery({
    queryKey: ['tiers', 'onboarding'],
    queryFn: () => serviceTiersControllerFindTiers({ page: 1, pageSize: 100 }),
    enabled: draft.step === 4,
  });
  const fixed = (tiers.data?.data.items ?? []).filter((tier) => {
    const identity = `${tier.tierCode} ${tier.tierName}`.toUpperCase();
    return ['GRATUIT', 'FREE', 'STANDARD', 'PREMIUM'].some((name) => identity.includes(name));
  });
  const save = (next: OnboardingDraft) => {
    setState(next);
    saveOnboardingDraft(next);
  };
  const site = (key: keyof OnboardingDraft['site'], value: unknown) => {
    save({ ...draft, site: { ...draft.site, [key]: value } });
  };
  async function next() {
    setBusy(true);
    setMessage('');
    try {
      let value = { ...draft };
      if (draft.step === 1 && !draft.confirmedSiteId) {
        if (!draft.site.siteName.trim()) throw new Error('Le nom du site est requis.');
        const result = await sitesControllerCreateSite(draft.site);
        value = { ...value, confirmedSiteId: result.data.siteId };
      } else if (draft.step === 2 && draft.confirmedSiteId) {
        await sitesControllerUpdateSite(draft.confirmedSiteId, draft.site);
      } else if (draft.step === 3 && draft.confirmedSiteId) {
        const ids = { ...draft.confirmedQueueIds };
        for (const queue of draft.queues) {
          if (!queueNeedsCreation({ ...draft, confirmedQueueIds: ids }, queue)) continue;
          const result = await queuesControllerCreateForSite(draft.confirmedSiteId, queue);
          ids[queue.queueCode.toUpperCase()] = result.data.queueId;
          value = { ...value, confirmedQueueIds: ids };
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
          for (const [index, tier] of selected.entries())
            await serviceTiersControllerAssociateTier(queueId, {
              tierId: tier.tierId,
              price: 0,
              displayOrder: index + 1,
              isDefault: index === 0,
            });
          done.add(queueId);
          value = { ...value, associatedTierQueueIds: [...done] };
          save(value);
        }
      } else if (draft.step === 6 && draft.confirmedSiteId) {
        await sitesControllerUpdateSite(draft.confirmedSiteId, { isActive: true });
        const activatedSite = draft.site.siteName;
        clearOnboardingDraft();
        setState(structuredClone(initialOnboardingDraft));
        notify({
          tone: 'success',
          title: 'Site activé',
          message: `${activatedSite} est prêt à être utilisé.`,
          duration: 8_000,
        });
        setMessage(
          `Le site ${activatedSite} est maintenant actif. La configuration est terminée et l’assistant a été réinitialisé.`,
        );
        return;
      }
      value.step = Math.min(6, draft.step + 1);
      save(value);
      setMessage('Étape enregistrée avec succès.');
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
        title="Configurer un nouveau site"
        description="Une configuration progressive, enregistrée à chaque étape."
        actions={<span className="status-badge status-info">Étape {draft.step} sur 6</span>}
      />
      {draft.confirmedSiteId ? (
        <Card className="resume-card">
          <div>
            <b>Configuration reprise automatiquement</b>
            <p>
              Site #{draft.confirmedSiteId} confirmé · {Object.keys(draft.confirmedQueueIds).length}{' '}
              file(s) confirmée(s)
            </p>
          </div>
          <span className="status-badge status-success">Brouillon local</span>
        </Card>
      ) : null}
      <div className="onboarding-layout">
        <Card className="setup-navigation">
          <h2>Parcours de configuration</h2>
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
                <span className="status-badge status-success">Terminé</span>
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
                save({ ...draft, step: draft.step - 1 });
              }}
            >
              ← Précédent
            </button>
            <div>
              <button
                className="button"
                onClick={() => {
                  saveOnboardingDraft(draft);
                }}
              >
                Enregistrer le brouillon
              </button>
              <button
                className="button button-primary"
                disabled={
                  busy ||
                  (draft.step === 3 && !draft.queues.length) ||
                  (draft.step === 4 &&
                    (fixed.length === 0 ||
                      Object.values(draft.confirmedQueueIds).some(
                        (queueId) => !(draft.selectedTierIds[String(queueId)] ?? []).length,
                      )))
                }
                onClick={() => void next()}
              >
                {draft.step === 6 ? 'Activer le site' : 'Enregistrer et continuer →'}
              </button>
            </div>
          </div>
        </Card>
      </div>
      <QueueEditor
        open={queueOpen}
        onOpenChange={setQueueOpen}
        onSave={(queue: CreateQueueDto) => {
          save({
            ...draft,
            queues: [...draft.queues.filter((item) => item.queueCode !== queue.queueCode), queue],
          });
        }}
      />
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
  const s = draft.site;
  return (
    <section>
      <Title
        title="Identité du site"
        text="Le nom est requis ; les autres champs reçoivent les defaults API."
      />
      <div className="form-grid">
        <label>
          Nom du site *
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
          Type
          <select
            value={s.siteType}
            onChange={(e) => {
              update('siteType', e.target.value);
            }}
          >
            <option value="public">Public</option>
            <option value="private">Privé</option>
          </select>
        </label>
        <label>
          Localisation
          <input
            maxLength={255}
            value={s.siteLocation ?? ''}
            onChange={(e) => {
              update('siteLocation', e.target.value);
            }}
          />
        </label>
        <label>
          URL du logo
          <input
            type="url"
            value={s.siteLogoUrl ?? ''}
            onChange={(e) => {
              update('siteLogoUrl', e.target.value);
            }}
          />
        </label>
        <label>
          Fuseau IANA
          <select
            value={s.timezone}
            onChange={(e) => {
              update('timezone', e.target.value);
            }}
          >
            <option>Africa/Tunis</option>
            <option>Europe/Paris</option>
            <option>Africa/Casablanca</option>
          </select>
        </label>
        <label>
          Locale
          <select
            value={s.defaultLocale}
            onChange={(e) => {
              update('defaultLocale', e.target.value);
            }}
          >
            <option>fr</option>
            <option>ar</option>
            <option>en</option>
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
  const s = draft.site;
  const n = (key: keyof OnboardingDraft['site'], value: string) => {
    update(key, Number(value));
  };
  return (
    <section>
      <Title
        title="Defaults opérationnels du site"
        text="Ces valeurs deviennent les paramètres hérités des files."
      />
      <div className="form-grid">
        <label>
          Devise
          <select
            value={s.defaultCurrency}
            onChange={(e) => {
              update('defaultCurrency', e.target.value);
            }}
          >
            <option>TND</option>
            <option>EUR</option>
            <option>USD</option>
          </select>
        </label>
        <label>
          Durée créneau
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
          Capacité
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
          Tolérance retard
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
          Ouverture
          <input
            type="time"
            value={s.defaultWorkingHoursStart}
            onChange={(e) => {
              update('defaultWorkingHoursStart', e.target.value);
            }}
          />
        </label>
        <label>
          Fermeture
          <input
            type="time"
            value={s.defaultWorkingHoursEnd}
            onChange={(e) => {
              update('defaultWorkingHoursEnd', e.target.value);
            }}
          />
        </label>
        <label>
          Début interruption
          <input
            type="time"
            value={s.defaultBreakStart}
            onChange={(e) => {
              update('defaultBreakStart', e.target.value);
            }}
          />
        </label>
        <label>
          Fin interruption
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
          <b>Rendez-vous activés par défaut</b>
          <small>Hérité par les files</small>
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
          <b>Reporter l’attente au lendemain</b>
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
function QueuesStep({ draft, open }: { draft: OnboardingDraft; open: () => void }) {
  return (
    <section>
      <Title
        title="Files & guichets"
        text="Choisissez l’héritage ou une surcharge propre à la file."
        action={
          <button className="button button-primary" onClick={open}>
            + Ajouter une file
          </button>
        }
      />
      <div className="inheritance-note">
        <b>Principe d’héritage</b>
        <p>Une valeur absente ou remise à « Hériter » utilise le default du site.</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Nom</th>
              <th>Guichets</th>
              <th>RDV</th>
              <th>Devise</th>
              <th>API</th>
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
                    ? 'Hérité'
                    : q.appointmentsEnabled
                      ? 'Activés'
                      : 'Désactivés'}
                </td>
                <td>{q.currency || 'Héritée'}</td>
                <td>
                  <span
                    className={`status-badge ${draft.confirmedQueueIds[q.queueCode] ? 'status-success' : ''}`}
                  >
                    {draft.confirmedQueueIds[q.queueCode] ? 'Confirmée' : 'Brouillon'}
                  </span>
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
  const queues = Object.entries(draft.confirmedQueueIds);
  const toggle = (queueId: number, tierId: number) => {
    const key = String(queueId);
    const selected = draft.selectedTierIds[key] ?? [];
    save({
      ...draft,
      selectedTierIds: {
        ...draft.selectedTierIds,
        [key]: selected.includes(tierId)
          ? selected.filter((current) => current !== tierId)
          : [...selected, tierId],
      },
    });
  };
  return (
    <section>
      <Title
        title="Niveaux de service"
        text="Sélectionnez au moins un niveau pour chaque file. Le premier niveau sélectionné sera proposé par défaut."
      />
      {loading ? <p>Chargement du catalogue…</p> : null}
      {fixed.length === 0 && !loading ? (
        <p className="admin-message" role="alert">
          Aucun niveau Gratuit, Standard ou Premium actif n’est disponible dans le catalogue API.
        </p>
      ) : null}
      {queues.map(([queueCode, queueId]) => {
        const selected = draft.selectedTierIds[String(queueId)] ?? [];
        return (
          <div className="tier-queue-section" key={queueId}>
            <div className="card-heading">
              <div>
                <h3>{queueCode}</h3>
                <p>{selected.length} niveau(x) sélectionné(s)</p>
              </div>
              {selected.length ? (
                <span className="status-badge status-success">Configuration prête</span>
              ) : (
                <span className="status-badge status-warning">Sélection requise</span>
              )}
            </div>
            <div className="tier-card-grid">
              {fixed.map((tier) => {
                const isSelected = selected.includes(tier.tierId);
                return (
                  <button
                    type="button"
                    className={`station tier-choice ${isSelected ? 'selected' : ''}`}
                    aria-pressed={isSelected}
                    key={tier.tierId}
                    onClick={() => {
                      toggle(queueId, tier.tierId);
                    }}
                  >
                    <span className={`status-badge ${isSelected ? 'status-success' : ''}`}>
                      {isSelected ? 'Sélectionné' : 'Sélectionner'}
                    </span>
                    <h3>{tier.tierName}</h3>
                    <p>{tier.description || tier.tierCode}</p>
                  </button>
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
  return (
    <section>
      <Title
        title="Équipe & appareils"
        text="Comptes humains, kiosque et display avec leurs périmètres."
      />
      <div className="empty-admin-state">
        <span className="ticket-chip">5</span>
        <h3>Assistant de comptes partagé</h3>
        <p>
          Créez le rôle initial puis affectez les sites et files dans la configuration centralisée.
        </p>
        <a className="button button-primary" href="/settings/users">
          Ouvrir les utilisateurs
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
  const checks = [
    ['Site et paramètres', Boolean(draft.confirmedSiteId)],
    ['Files et guichets', Object.keys(draft.confirmedQueueIds).length > 0],
    ['Niveaux associés', draft.associatedTierQueueIds.length > 0],
  ] as const;
  return (
    <section>
      <Title title="Recette & activation" text="Validez le parcours avant l’ouverture au public." />
      {checks.map(([label, done]) => (
        <div className="check-row" key={label}>
          <b>{label}</b>
          <span className={`status-badge ${done ? 'status-success' : 'status-warning'}`}>
            {done ? 'Validé' : 'À faire'}
          </span>
        </div>
      ))}
      <div className="check-row">
        <div>
          <b>Test d’appel complet</b>
          <p>Occuper un guichet, appeler puis servir.</p>
        </div>
        {draft.testValidated ? (
          <span className="status-badge status-success">Validé</span>
        ) : (
          <button
            className="button"
            onClick={() => {
              save({ ...draft, testValidated: true });
            }}
          >
            Lancer le test
          </button>
        )}
      </div>
    </section>
  );
}
