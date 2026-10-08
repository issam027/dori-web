import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sitesControllerFindSites, sitesControllerUpdateSite } from '@/api/generated/sites/sites';
import {
  queuesControllerCreateForSite,
  queuesControllerFindAll,
  queuesControllerUpdate,
} from '@/api/generated/queues/queues';
import {
  usersControllerFindUsers,
  usersControllerGetRoles,
  usersControllerSetUserPassword,
  usersControllerUpdateUserStatus,
} from '@/api/generated/users/users';
import {
  serviceTiersControllerAssociateTier,
  serviceTiersControllerCreateRule,
  serviceTiersControllerFindTiers,
} from '@/api/generated/tiers/tiers';
import {
  translationsControllerCreateTranslation,
  translationsControllerFindTranslations,
} from '@/api/generated/translations/translations';
import type { QueueResponseDto } from '@/api/generated/models';
import { useScopeStore } from '@/core/scope/scope-store';
import { useSessionStore } from '@/core/auth/session-store';
import { Card, MetricCard } from '@/design-system/components/Card';
import { PageHeader } from '@/design-system/components/PageHeader';
import { Modal } from '@/design-system/components/Modal';
import { QueueEditor } from '@/features/queues/QueueEditor';
import { UserAccountWizard } from '@/features/users/UserAccountWizard';

const sections = ['sites', 'queues', 'users', 'tiers', 'notifications', 'translations'] as const;
type Section = (typeof sections)[number];
export function SettingsPage() {
  const location = useLocation(),
    qc = useQueryClient(),
    siteId = useScopeStore((s) => s.activeSiteId),
    current = useSessionStore((s) => s.user);
  const suffix = location.pathname.split('/')[2] as Section;
  const section = sections.includes(suffix) ? suffix : 'sites';
  const sites = useQuery({
      queryKey: ['admin', 'sites'],
      queryFn: () => sitesControllerFindSites({ page: 1, pageSize: 100 }),
    }),
    queues = useQuery({
      queryKey: ['admin', 'queues', siteId],
      queryFn: () =>
        queuesControllerFindAll({ page: 1, pageSize: 100, siteId: siteId ?? undefined }),
      enabled: Boolean(siteId),
    }),
    users = useQuery({
      queryKey: ['admin', 'users'],
      queryFn: () => usersControllerFindUsers({ page: 1, pageSize: 100 }),
    }),
    roles = useQuery({
      queryKey: ['admin', 'roles'],
      queryFn: () => usersControllerGetRoles({ page: 1, pageSize: 100 }),
    }),
    tiers = useQuery({
      queryKey: ['admin', 'tiers'],
      queryFn: () => serviceTiersControllerFindTiers({ page: 1, pageSize: 100 }),
    }),
    translations = useQuery({
      queryKey: ['admin', 'translations'],
      queryFn: () => translationsControllerFindTranslations({ page: 1, pageSize: 100 }),
    });
  const ss = sites.data?.data.items ?? [],
    qs = queues.data?.data.items ?? [],
    us = users.data?.data.items ?? [],
    rs = roles.data?.data.items ?? [],
    ts = tiers.data?.data.items ?? [],
    xs = translations.data?.data.items ?? [];
  const refresh = () => void qc.invalidateQueries({ queryKey: ['admin'] });
  const [queueOpen, setQueueOpen] = useState(false),
    [editQueue, setEditQueue] = useState<QueueResponseDto>(),
    [userOpen, setUserOpen] = useState(false),
    [tierOpen, setTierOpen] = useState(false),
    [ruleOpen, setRuleOpen] = useState(false),
    [translationOpen, setTranslationOpen] = useState(false);
  const rank = Math.min(
    ...rs.filter((r) => current?.roles.includes(r.roleName)).map((r) => r.rank),
    999,
  );
  return (
    <div className="page-stack admin-page">
      <PageHeader
        eyebrow="Administration"
        title="Configuration du service"
        description="Gérez les ressources réellement proposées par DORI."
        actions={
          <span className="status-badge status-success">
            Scope : {ss.find((s) => s.siteId === siteId)?.siteName ?? 'global'}
          </span>
        }
      />
      <div className="metrics-grid">
        <MetricCard label="Files configurées" value={qs.length} />
        <MetricCard label="Utilisateurs actifs" value={us.filter((u) => u.isActive).length} />
        <MetricCard label="Niveaux" value={ts.length} />
        <MetricCard label="Traductions" value={xs.length} />
      </div>
      <Card>
        <div className="config-chain">
          {['Site', 'Files du site', 'Comptes', 'Affectations'].map((x, i) => (
            <Link
              className="role-card"
              to={`/settings/${i === 0 ? 'sites' : i === 1 ? 'queues' : 'users'}`}
              key={x}
            >
              <span className="ticket-chip">{i + 1}</span>
              <b>{x}</b>
            </Link>
          ))}
        </div>
      </Card>
      <Card className="settings-card">
        <nav className="admin-tabs">
          {sections.map((x) => (
            <Link className={section === x ? 'active' : ''} to={`/settings/${x}`} key={x}>
              {x === 'queues' ? 'Files' : x.charAt(0).toUpperCase() + x.slice(1)}
            </Link>
          ))}
        </nav>
        {section === 'sites' ? <SitesPanel items={ss} refresh={refresh} /> : null}
        {section === 'queues' ? (
          <QueuesPanel
            items={qs}
            create={() => {
              setEditQueue(undefined);
              setQueueOpen(true);
            }}
            edit={(q) => {
              setEditQueue(q);
              setQueueOpen(true);
            }}
            refresh={refresh}
          />
        ) : null}
        {section === 'users' ? (
          <UsersPanel
            items={us}
            create={() => {
              setUserOpen(true);
            }}
            refresh={refresh}
          />
        ) : null}
        {section === 'tiers' ? (
          <TiersPanel
            items={ts}
            open={() => {
              setTierOpen(true);
            }}
          />
        ) : null}
        {section === 'notifications' ? (
          <NotificationsPanel
            open={() => {
              setRuleOpen(true);
            }}
          />
        ) : null}
        {section === 'translations' ? (
          <TranslationsPanel
            items={xs}
            open={() => {
              setTranslationOpen(true);
            }}
          />
        ) : null}
      </Card>
      <QueueEditor
        key={editQueue?.queueId ?? 'new'}
        open={queueOpen}
        onOpenChange={setQueueOpen}
        initial={editQueue}
        onSave={async (v) => {
          if (editQueue) await queuesControllerUpdate(editQueue.queueId, v);
          else if (siteId) await queuesControllerCreateForSite(siteId, v);
          refresh();
        }}
      />
      <UserAccountWizard
        open={userOpen}
        onOpenChange={setUserOpen}
        roles={rs}
        sites={ss}
        queues={qs}
        currentRoleRank={rank}
        onCreated={refresh}
      />
      <TierModal open={tierOpen} close={setTierOpen} queues={qs} tiers={ts} refresh={refresh} />
      <RuleModal open={ruleOpen} close={setRuleOpen} queues={qs} tiers={ts} refresh={refresh} />
      <TranslationModal open={translationOpen} close={setTranslationOpen} refresh={refresh} />
    </div>
  );
}

function Header({
  title,
  text,
  action,
  label,
}: {
  title: string;
  text: string;
  action?: () => void;
  label?: string;
}) {
  return (
    <div className="card-heading">
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      {action ? (
        <button className="button button-primary" onClick={action}>
          + {label}
        </button>
      ) : null}
    </div>
  );
}
type Sites = Awaited<ReturnType<typeof sitesControllerFindSites>>['data']['items'];
type Users = Awaited<ReturnType<typeof usersControllerFindUsers>>['data']['items'];
type Tiers = Awaited<ReturnType<typeof serviceTiersControllerFindTiers>>['data']['items'];
type Translations = Awaited<
  ReturnType<typeof translationsControllerFindTranslations>
>['data']['items'];
function SitesPanel({ items, refresh }: { items: Sites; refresh: () => void }) {
  return (
    <section>
      <Header
        title="Sites & managers"
        text="Identité, defaults opérationnels, responsables et activation réelle."
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Site</th>
              <th>Localisation</th>
              <th>Fuseau</th>
              <th>Devise</th>
              <th>État</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.siteId}>
                <td>
                  <b>{s.siteName}</b>
                  <small>
                    {s.siteType} · {s.defaultLocale}
                  </small>
                </td>
                <td>{s.siteLocation ?? '—'}</td>
                <td>{s.timezone}</td>
                <td>{s.defaultCurrency}</td>
                <td>
                  <span className={`status-badge ${s.isActive ? 'status-success' : ''}`}>
                    {s.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td>
                  <button
                    className="button button-small"
                    onClick={() =>
                      void sitesControllerUpdateSite(s.siteId, { isActive: !s.isActive }).then(
                        refresh,
                      )
                    }
                  >
                    {s.isActive ? 'Désactiver' : 'Activer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link className="button button-primary" to="/onboarding">
        + Nouveau site complet
      </Link>
    </section>
  );
}
function QueuesPanel({
  items,
  create,
  edit,
  refresh,
}: {
  items: QueueResponseDto[];
  create: () => void;
  edit: (q: QueueResponseDto) => void;
  refresh: () => void;
}) {
  return (
    <section>
      <Header
        title="Files d’attente"
        text="Paramètres effectifs, héritage, guichets et opérateurs."
        action={create}
        label="Nouvelle file"
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Guichets</th>
              <th>RDV</th>
              <th>Devise / locale</th>
              <th>Origines</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((q) => (
              <tr key={q.queueId}>
                <td>
                  <b>
                    {q.queueCode} · {q.queueName}
                  </b>
                  <small>{q.averageWaitTime} min</small>
                </td>
                <td>{q.threadCount}</td>
                <td>{q.appointmentsEnabled ? 'Activés' : 'Désactivés'}</td>
                <td>
                  {q.currency} · {q.locale}
                </td>
                <td>
                  <span className="status-badge status-info">
                    {Object.values(q.configOrigins).filter((v) => v === 'site').length} hérités
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      className="button button-small"
                      onClick={() => {
                        edit(q);
                      }}
                    >
                      Modifier
                    </button>
                    <button
                      className="button button-small"
                      onClick={() =>
                        void queuesControllerUpdate(q.queueId, { isActive: !q.isActive }).then(
                          refresh,
                        )
                      }
                    >
                      {q.isActive ? 'Désactiver' : 'Activer'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function UsersPanel({
  items,
  create,
  refresh,
}: {
  items: Users;
  create: () => void;
  refresh: () => void;
}) {
  return (
    <section>
      <Header
        title="Utilisateurs & rôles"
        text="Compte, email, langue, statut, mot de passe, rôle et périmètre."
        action={create}
        label="Nouvel utilisateur"
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Type</th>
              <th>Rôles</th>
              <th>Scope</th>
              <th>Langue</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.userId}>
                <td>
                  <b>{u.username}</b>
                  <small>{u.email ?? 'Sans email'}</small>
                </td>
                <td>{u.userType}</td>
                <td>Voir la fiche</td>
                <td>Affectations gérées par l’assistant</td>
                <td>{u.languagePreference}</td>
                <td>
                  <div className="table-actions">
                    <button
                      className="button button-small"
                      onClick={() =>
                        void usersControllerUpdateUserStatus(u.userId, {
                          isActive: !u.isActive,
                        }).then(refresh)
                      }
                    >
                      {u.isActive ? 'Suspendre' : 'Activer'}
                    </button>
                    <button
                      className="button button-small"
                      onClick={() =>
                        void usersControllerSetUserPassword(u.userId, {
                          newPassword: 'Root@123456',
                        })
                      }
                    >
                      Réinitialiser MDP
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function TiersPanel({ items, open }: { items: Tiers; open: () => void }) {
  return (
    <section>
      <Header
        title="Niveaux de service"
        text="Catalogue fixe Gratuit, Standard et Premium ; disponibilité par file."
        action={open}
        label="Associer un niveau"
      />
      <div className="tier-card-grid">
        {items.map((t) => (
          <div className="station" key={t.tierId}>
            <span className="status-badge status-info">{t.isSystem ? 'Système' : 'Catalogue'}</span>
            <h3>{t.tierName}</h3>
            <p>
              {t.tierCode} · {t.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
function NotificationsPanel({ open }: { open: () => void }) {
  const [text, setText] = useState('Bienvenue, votre ticket {ticket} est enregistré.');
  return (
    <section>
      <Header
        title="Règles de notification"
        text="Règles persistantes par file et niveau, avec simulation locale."
        action={open}
        label="Nouvelle règle"
      />
      <div className="sms-preview-grid">
        <label>
          Message
          <textarea
            rows={6}
            maxLength={480}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
            }}
          />
          <small>
            {text.length}/480 · {Math.ceil(text.length / 160) || 1} segment(s)
          </small>
        </label>
        <div className="phone-preview">
          <b>DORI</b>
          <p>{text.replace('{ticket}', 'A-048')}</p>
        </div>
      </div>
    </section>
  );
}
function TranslationsPanel({ items, open }: { items: Translations; open: () => void }) {
  return (
    <section>
      <Header
        title="Traductions dynamiques"
        text="Catégories IHM, SMS et erreurs, avec paramètres attendus."
        action={open}
        label="Nouvelle clé"
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Clé</th>
              <th>Catégorie</th>
              <th>Locale</th>
              <th>Contenu</th>
              <th>Variables</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.translationId}>
                <td>
                  <code>{x.translationKey}</code>
                </td>
                <td>{x.category}</td>
                <td>{x.locale}</td>
                <td>{x.content}</td>
                <td>{x.expectedParams?.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function TierModal({
  open,
  close,
  queues,
  tiers,
  refresh,
}: {
  open: boolean;
  close: (v: boolean) => void;
  queues: QueueResponseDto[];
  tiers: Tiers;
  refresh: () => void;
}) {
  const [f, setF] = useState({
    queueId: 0,
    tierId: 0,
    price: 0,
    currency: '',
    order: 1,
    default: false,
  });
  return (
    <Modal
      open={open}
      onOpenChange={close}
      title="Associer un niveau"
      actions={
        <button
          className="button button-primary"
          disabled={!f.queueId || !f.tierId}
          onClick={() =>
            void serviceTiersControllerAssociateTier(f.queueId, {
              tierId: f.tierId,
              price: f.price,
              currency: f.currency || null,
              displayOrder: f.order,
              isDefault: f.default,
            }).then(() => {
              refresh();
              close(false);
            })
          }
        >
          Associer
        </button>
      }
    >
      <div className="form-grid">
        <Select
          label="File"
          items={queues.map((q) => [q.queueId, q.queueName])}
          change={(id) => {
            setF({ ...f, queueId: id });
          }}
        />
        <Select
          label="Niveau"
          items={tiers
            .filter((t) => ['GRATUIT', 'STANDARD', 'PREMIUM'].includes(t.tierCode.toUpperCase()))
            .map((t) => [t.tierId, t.tierName])}
          change={(id) => {
            setF({ ...f, tierId: id });
          }}
        />
        <label>
          Prix
          <input
            type="number"
            min="0"
            value={f.price}
            onChange={(e) => {
              setF({ ...f, price: Number(e.target.value) });
            }}
          />
        </label>
        <label>
          Devise
          <input
            maxLength={3}
            placeholder="Héritée"
            value={f.currency}
            onChange={(e) => {
              setF({ ...f, currency: e.target.value.toUpperCase() });
            }}
          />
        </label>
        <label>
          Ordre
          <input
            type="number"
            min="0"
            value={f.order}
            onChange={(e) => {
              setF({ ...f, order: Number(e.target.value) });
            }}
          />
        </label>
        <label className="check-row">
          Par défaut
          <input
            type="checkbox"
            checked={f.default}
            onChange={(e) => {
              setF({ ...f, default: e.target.checked });
            }}
          />
        </label>
      </div>
    </Modal>
  );
}
function RuleModal({
  open,
  close,
  queues,
  tiers,
  refresh,
}: {
  open: boolean;
  close: (v: boolean) => void;
  queues: QueueResponseDto[];
  tiers: Tiers;
  refresh: () => void;
}) {
  const [f, setF] = useState({
    queueId: 0,
    tierId: 0,
    type: 'welcome',
    channel: 'sms',
    threshold: 'position',
    value: 3,
    tracking: true,
  });
  return (
    <Modal
      open={open}
      onOpenChange={close}
      title="Nouvelle règle"
      actions={
        <button
          className="button button-primary"
          disabled={!f.queueId || !f.tierId}
          onClick={() =>
            void serviceTiersControllerCreateRule(f.queueId, f.tierId, {
              notificationType: f.type as 'welcome' | 'threshold',
              channel: f.channel as 'sms' | 'email',
              thresholdType:
                f.type === 'threshold' ? (f.threshold as 'position' | 'estimatedTime') : undefined,
              thresholdValue: f.type === 'threshold' ? f.value : undefined,
              includeTrackingLink: f.tracking,
            }).then(() => {
              refresh();
              close(false);
            })
          }
        >
          Enregistrer
        </button>
      }
    >
      <div className="form-grid">
        <Select
          label="File"
          items={queues.map((q) => [q.queueId, q.queueName])}
          change={(id) => {
            setF({ ...f, queueId: id });
          }}
        />
        <Select
          label="Niveau"
          items={tiers.map((t) => [t.tierId, t.tierName])}
          change={(id) => {
            setF({ ...f, tierId: id });
          }}
        />
        <label>
          Type
          <select
            value={f.type}
            onChange={(e) => {
              setF({ ...f, type: e.target.value });
            }}
          >
            <option value="welcome">Welcome</option>
            <option value="threshold">Threshold</option>
          </select>
        </label>
        <label>
          Canal
          <select
            value={f.channel}
            onChange={(e) => {
              setF({ ...f, channel: e.target.value });
            }}
          >
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </select>
        </label>
        {f.type === 'threshold' ? (
          <>
            <label>
              Seuil
              <select
                value={f.threshold}
                onChange={(e) => {
                  setF({ ...f, threshold: e.target.value });
                }}
              >
                <option value="position">Position</option>
                <option value="estimatedTime">Temps estimé</option>
              </select>
            </label>
            <label>
              Valeur
              <input
                type="number"
                min="1"
                value={f.value}
                onChange={(e) => {
                  setF({ ...f, value: Number(e.target.value) });
                }}
              />
            </label>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
function TranslationModal({
  open,
  close,
  refresh,
}: {
  open: boolean;
  close: (v: boolean) => void;
  refresh: () => void;
}) {
  const [f, setF] = useState({ key: '', category: 'ihm', locale: 'fr', content: '', params: '' });
  return (
    <Modal
      open={open}
      onOpenChange={close}
      title="Nouvelle traduction"
      actions={
        <button
          className="button button-primary"
          disabled={!f.key || !f.content}
          onClick={() =>
            void translationsControllerCreateTranslation({
              translationKey: f.key,
              category: f.category as 'ihm' | 'sms' | 'error',
              locale: f.locale,
              content: f.content,
              expectedParams: f.params
                .split(',')
                .map((x) => x.trim())
                .filter(Boolean),
            }).then(() => {
              refresh();
              close(false);
            })
          }
        >
          Enregistrer
        </button>
      }
    >
      <div className="form-grid">
        <label>
          Clé
          <input
            value={f.key}
            onChange={(e) => {
              setF({ ...f, key: e.target.value });
            }}
          />
        </label>
        <label>
          Catégorie
          <select
            value={f.category}
            onChange={(e) => {
              setF({ ...f, category: e.target.value });
            }}
          >
            <option>ihm</option>
            <option>sms</option>
            <option>error</option>
          </select>
        </label>
        <label>
          Locale
          <input
            value={f.locale}
            onChange={(e) => {
              setF({ ...f, locale: e.target.value });
            }}
          />
        </label>
        <label>
          Paramètres
          <input
            placeholder="ticket, position"
            value={f.params}
            onChange={(e) => {
              setF({ ...f, params: e.target.value });
            }}
          />
        </label>
        <label className="form-span">
          Contenu
          <textarea
            rows={4}
            value={f.content}
            onChange={(e) => {
              setF({ ...f, content: e.target.value });
            }}
          />
        </label>
      </div>
    </Modal>
  );
}
function Select({
  label,
  items,
  change,
}: {
  label: string;
  items: [number, string][];
  change: (id: number) => void;
}) {
  return (
    <label>
      {label}
      <select
        onChange={(e) => {
          change(Number(e.target.value));
        }}
      >
        <option value="">Choisir</option>
        {items.map(([id, name]) => (
          <option value={id} key={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
