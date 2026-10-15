import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Eye,
  Languages,
  Mail,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Search,
  StickyNote,
  UserRound,
  UsersRound,
} from 'lucide-react';
import type { CreatePersonDto, PersonResponseDto, PersonsControllerFindPersonsSort, UpdatePersonDto } from '@/api/generated/models';
import { queryKeys } from '@/api/client/query-keys';
import { useScopeStore } from '@/core/scope/scope-store';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { Card } from '@/design-system/components/Card';
import { EmptyState, ErrorState } from '@/design-system/components/FeedbackState';
import { Modal } from '@/design-system/components/Modal';
import { PageHeader } from '@/design-system/components/PageHeader';
import { Pagination } from '@/design-system/components/Pagination';
import { createPerson, findPersons, updatePerson } from './api/persons-api';
import { PersonFormModal } from './PersonFormModal';
import { PersonNotesViewer } from './PersonNotesViewer';
import { displayPersonLanguage, formatPersonDate } from './person-display';

const PAGE_SIZE = 10;

export function PersonsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const siteId = useScopeStore((state) => state.activeSiteId);
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusDraft, setStatusDraft] = useState<'all' | 'active' | 'inactive'>('active');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [sortDraft, setSortDraft] = useState<PersonsControllerFindPersonsSort>('lastName:asc');
  const [sort, setSort] = useState<PersonsControllerFindPersonsSort>('lastName:asc');
  const [viewing, setViewing] = useState<PersonResponseDto>();
  const [editing, setEditing] = useState<PersonResponseDto>();
  const [notesPerson, setNotesPerson] = useState<PersonResponseDto>();
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const persons = useQuery({
    queryKey: [...queryKeys.persons.search(siteId, search, page, PAGE_SIZE, 'admin-page'), { status, sort }],
    queryFn: ({ signal }) => {
      if (!siteId) throw new Error('An active site is required');
      return findPersons(
        {
          siteId,
          page,
          pageSize: PAGE_SIZE,
          sort,
          isActive: status === 'all' ? undefined : status === 'active',
          search: search || undefined,
        },
        signal,
      );
    },
    enabled: Boolean(siteId),
  });
  const items = persons.data?.data.items ?? [];
  const totalPages = Math.max(1, persons.data?.data.totalPages ?? 1);
  const total = persons.data?.data.total ?? 0;
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.persons.all });
  const save = async (value: CreatePersonDto | UpdatePersonDto) => {
    if (!siteId) return;
    setPending(true);
    try {
      if (editing) {
        await updatePerson(editing.personId, value);
        notify({ tone: 'success', title: t('persons.admin.updated') });
        setEditing(undefined);
      } else {
        await createPerson({ ...value, siteId } as CreatePersonDto);
        notify({ tone: 'success', title: t('persons.admin.created') });
        setCreateOpen(false);
      }
      await refresh();
    } catch (error) {
      notifyError(error);
    } finally {
      setPending(false);
    }
  };
  const formatDate = (value?: string | null) =>
    formatPersonDate(value, i18n.language) ?? t('common.notProvided');
  const formatLanguage = (value?: string | null) =>
    displayPersonLanguage(value) ?? t('common.notProvided');

  return (
    <div className="page-stack admin-page persons-admin-page">
      <PageHeader
        eyebrow={t('nav.operations')}
        title={t('persons.admin.title')}
        description={t('persons.admin.description')}
        actions={
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              setCreateOpen(true);
            }}
          >
            <Plus aria-hidden="true" /> {t('persons.admin.newPerson')}
          </button>
        }
      />
      <Card className="admin-filter-card">
        <details>
          <summary>
            <span>
              <Search aria-hidden="true" /> {t('persons.admin.searchTitle')}
            </span>
            <small>{t('persons.admin.searchHint')}</small>
          </summary>
          <form
            className="admin-filter-grid persons-filter-grid"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(searchDraft.trim());
              setStatus(statusDraft);
              setSort(sortDraft);
            }}
          >
            <label>
              {t('common.search')}
              <input
                value={searchDraft}
                placeholder={t('persons.admin.searchPlaceholder')}
                onChange={(event) => {
                  setSearchDraft(event.target.value);
                }}
              />
            </label>
            <label>
              {t('persons.admin.statusFilter')}
              <select value={statusDraft} onChange={(event) => { setStatusDraft(event.target.value as 'all' | 'active' | 'inactive'); }}>
                <option value="all">{t('persons.admin.allStatuses')}</option>
                <option value="active">{t('common.active')}</option>
                <option value="inactive">{t('common.inactive')}</option>
              </select>
            </label>
            <label>
              {t('persons.admin.sort')}
              <select value={sortDraft} onChange={(event) => { setSortDraft(event.target.value as PersonsControllerFindPersonsSort); }}>
                <option value="lastName:asc">{t('persons.admin.sort.lastNameAsc')}</option>
                <option value="lastName:desc">{t('persons.admin.sort.lastNameDesc')}</option>
                <option value="firstName:asc">{t('persons.admin.sort.firstNameAsc')}</option>
                <option value="firstName:desc">{t('persons.admin.sort.firstNameDesc')}</option>
                <option value="createdAt:desc">{t('persons.admin.sort.newest')}</option>
                <option value="createdAt:asc">{t('persons.admin.sort.oldest')}</option>
                <option value="email:asc">{t('persons.admin.sort.email')}</option>
                <option value="phoneNumber:asc">{t('persons.admin.sort.phone')}</option>
              </select>
            </label>
            <div className="admin-filter-actions">
              <button
                className="button"
                type="button"
                onClick={() => {
                  setSearchDraft('');
                  setSearch('');
                  setStatusDraft('active');
                  setStatus('active');
                  setSortDraft('lastName:asc');
                  setSort('lastName:asc');
                  setPage(1);
                }}
              >
                <RotateCcw aria-hidden="true" /> {t('common.reset')}
              </button>
              <button className="button button-primary" type="submit">
                <Search aria-hidden="true" /> {t('common.apply')}
              </button>
            </div>
          </form>
        </details>
      </Card>
      <Card className="settings-card">
        <div className="card-heading">
          <div>
            <span className="translation-heading-icon">
              <UsersRound aria-hidden="true" />
            </span>
            <h2>{t('persons.admin.directory')}</h2>
            <p>{t('persons.admin.resultCount', { count: total })}</p>
          </div>
        </div>
        {persons.isError ? (
          <ErrorState onRetry={() => void persons.refetch()} />
        ) : !persons.isLoading && items.length === 0 ? (
          <EmptyState title={t('persons.admin.empty')} description={t('persons.admin.emptyHint')} />
        ) : (
          <div className="table-wrap admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('persons.admin.person')}</th>
                  <th>{t('common.contact')}</th>
                  <th>{t('persons.personPickerOrCreate.birthDate')}</th>
                  <th>{t('common.language')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((person) => (
                  <tr key={person.personId}>
                    <td>
                      <b>{[person.firstName, person.lastName].filter(Boolean).join(' ')}</b>
                      <small>#{person.personId}</small>
                    </td>
                    <td>
                      <span>{person.phoneNumber ?? t('common.notProvided')}</span>
                      <small>{person.email ?? t('settings.noEmail')}</small>
                    </td>
                    <td>{formatDate(person.birthDate)}</td>
                    <td>{formatLanguage(person.preferredLanguage)}</td>
                    <td>
                      <span
                        className={`status-badge ${person.isActive ? 'status-success' : 'status-warning'}`}
                      >
                        {t(person.isActive ? 'common.active' : 'common.inactive')}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions responsive-table-actions">
                        <button
                          className="button button-small"
                          type="button"
                          title={t('common.view')}
                          onClick={() => {
                            setViewing(person);
                          }}
                        >
                          <Eye aria-hidden="true" /> {t('common.view')}
                        </button>
                        <button
                          className="button button-small"
                          type="button"
                          title={t('common.edit')}
                          onClick={() => {
                            setEditing(person);
                          }}
                        >
                          <Pencil aria-hidden="true" /> {t('common.edit')}
                        </button>
                        <button
                          className="button button-small"
                          type="button"
                          title={t('persons.admin.notes')}
                          onClick={() => {
                            setNotesPerson(person);
                          }}
                        >
                          <StickyNote aria-hidden="true" /> {t('persons.admin.notes')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 ? (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        ) : null}
      </Card>
      <PersonFormModal
        key={editing?.personId ?? 'create'}
        open={createOpen || Boolean(editing)}
        person={editing}
        pending={pending}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditing(undefined);
          }
        }}
        onSubmit={(value) => void save(value)}
      />
      {notesPerson ? (
        <PersonNotesViewer
          key={notesPerson.personId}
          personId={notesPerson.personId}
          open
          onOpenChange={(open) => {
            if (!open) setNotesPerson(undefined);
          }}
        />
      ) : null}
      <Modal
        open={Boolean(viewing)}
        onOpenChange={(open) => {
          if (!open) setViewing(undefined);
        }}
        title={t('persons.admin.detailsTitle')}
        description={
          viewing ? [viewing.firstName, viewing.lastName].filter(Boolean).join(' ') : undefined
        }
        actions={
          viewing ? (
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                setEditing(viewing);
                setViewing(undefined);
              }}
            >
              <Pencil aria-hidden="true" /> {t('common.edit')}
            </button>
          ) : undefined
        }
      >
        {viewing ? (
          <div className="person-detail-panel">
            <div className="translation-modal-intro">
              <span>
                <UserRound aria-hidden="true" />
              </span>
              <div>
                <strong>{[viewing.firstName, viewing.lastName].filter(Boolean).join(' ')}</strong>
                <small>{t('persons.admin.personReference', { id: viewing.personId })}</small>
              </div>
            </div>
            <dl className="detail-list person-detail-list">
              <dt>
                <Phone aria-hidden="true" /> {t('common.phone')}
              </dt>
              <dd>{viewing.phoneNumber ?? t('common.notProvided')}</dd>
              <dt>
                <Mail aria-hidden="true" /> {t('common.email')}
              </dt>
              <dd>{viewing.email ?? t('settings.noEmail')}</dd>
              <dt>
                <CalendarDays aria-hidden="true" /> {t('persons.personPickerOrCreate.birthDate')}
              </dt>
              <dd>{formatDate(viewing.birthDate)}</dd>
              <dt>
                <Languages aria-hidden="true" /> {t('common.language')}
              </dt>
              <dd>{formatLanguage(viewing.preferredLanguage)}</dd>
              <dt>
                <Save aria-hidden="true" /> {t('common.createdAt')}
              </dt>
              <dd>{formatDate(viewing.createdAt)}</dd>
            </dl>
          </div>
        ) : (
          <span />
        )}
      </Modal>
    </div>
  );
}
