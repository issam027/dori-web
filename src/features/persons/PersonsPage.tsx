import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
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
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react';
import type {
  CreatePersonDto,
  PersonResponseDto,
  PersonsControllerFindPersonsSort,
  UpdatePersonDto,
} from '@/api/generated/models';
import { queryKeys } from '@/api/client/query-keys';
import { useScopeStore } from '@/core/scope/scope-store';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { Card } from '@/design-system/components/Card';
import { EmptyState, ErrorState } from '@/design-system/components/FeedbackState';
import { Modal } from '@/design-system/components/Modal';
import { PageHeader } from '@/design-system/components/PageHeader';
import { Pagination } from '@/design-system/components/Pagination';
import { createPerson, deletePerson, updatePerson } from './api/persons-api';
import { useAdminPersons } from './hooks/usePersons';
import { PersonFormModal } from './PersonFormModal';
import { PersonNotesViewer } from '@/features/notes/PersonNotesViewer';
import { PersonNotesButton } from '@/features/notes/PersonNotesButton';
import { displayPersonLanguage, formatPersonDate } from './person-display';
import { useSessionStore } from '@/core/auth/session-store';
import { hasPermission } from '@/core/permissions/permissions';
import { useDebouncedFilter } from '@/shared/forms/useDebouncedFilter';
import { Button } from '@/design-system/components/Button';
import { DataTable } from '@/design-system/components/DataTable';
import { FilterPanel } from '@/design-system/components/FilterPanel';
import { PersonMobileCard } from './PersonMobileCard';

export function PersonsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const siteId = useScopeStore((state) => state.activeSiteId);
  const canDelete = hasPermission(
    useSessionStore((state) => state.user),
    'registration_delete',
  );
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const search = useDebouncedFilter(searchDraft);
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [sort, setSort] = useState<PersonsControllerFindPersonsSort>('lastName:asc');
  const [viewing, setViewing] = useState<PersonResponseDto>();
  const [editing, setEditing] = useState<PersonResponseDto>();
  const [notesPerson, setNotesPerson] = useState<PersonResponseDto>();
  const [notesMode, setNotesMode] = useState<'view' | 'add'>('view');
  const [deleting, setDeleting] = useState<PersonResponseDto>();
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const persons = useAdminPersons({ siteId, search, page, status, sort });
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
  const reactivate = async (person: PersonResponseDto) => {
    setPending(true);
    try {
      await updatePerson(person.personId, { isActive: true });
      await refresh();
      notify({ tone: 'success', title: t('persons.admin.reactivated') });
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
          <Button
            variant="primary"
            labelMode="always"
            type="button"
            onClick={() => {
              setCreateOpen(true);
            }}
          >
            <Plus aria-hidden="true" /> {t('persons.admin.newPerson')}
          </Button>
        }
      />
      <FilterPanel
        context={t(
          status === 'all'
            ? 'persons.admin.allStatuses'
            : status === 'active'
              ? 'common.active'
              : 'common.inactive',
        )}
        primary={
          <label>
            {t('common.search')}
            <input
              type="search"
              value={searchDraft}
              placeholder={t('persons.admin.searchPlaceholder')}
              onChange={(event) => {
                setSearchDraft(event.target.value);
                setPage(1);
              }}
            />
          </label>
        }
        icon={<Search />}
        title={t('persons.admin.searchTitle')}
        description={t('persons.admin.searchHint')}
        activeCount={
          Number(Boolean(searchDraft)) +
          Number(status !== 'active') +
          Number(sort !== 'lastName:asc')
        }
        resetLabel={t('common.reset')}
        onReset={() => {
          setSearchDraft('');
          setStatus('active');
          setSort('lastName:asc');
          setPage(1);
        }}
      >
        <div className="admin-filter-grid persons-filter-grid">
          <label>
            {t('persons.admin.statusFilter')}
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as 'all' | 'active' | 'inactive');
                setPage(1);
              }}
            >
              <option value="all">{t('persons.admin.allStatuses')}</option>
              <option value="active">{t('common.active')}</option>
              <option value="inactive">{t('common.inactive')}</option>
            </select>
          </label>
          <label>
            {t('persons.admin.sort')}
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as PersonsControllerFindPersonsSort);
                setPage(1);
              }}
            >
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
        </div>
      </FilterPanel>
      <Card className="settings-card">
        <div className="card-heading persons-directory-heading">
          <span className="translation-heading-icon">
            <UsersRound aria-hidden="true" />
          </span>
          <div>
            <h2>{t('persons.admin.directory')}</h2>
            <p>{t('persons.admin.resultCount', { count: total })}</p>
          </div>
        </div>
        {persons.isError ? (
          <ErrorState onRetry={() => void persons.refetch()} />
        ) : !persons.isLoading && items.length === 0 ? (
          <EmptyState title={t('persons.admin.empty')} description={t('persons.admin.emptyHint')} />
        ) : (
          <DataTable
            resultSummary={t('persons.admin.resultCount', { count: total })}
            loading={persons.isLoading}
            caption={t('persons.admin.title')}
            containerClassName="table-wrap admin-table-wrap"
            mobileRows={items}
            getMobileRowKey={(person) => person.personId}
            renderMobileRow={(person) => (
              <PersonMobileCard
                person={person}
                canDelete={canDelete}
                pending={pending}
                formatDate={formatDate}
                formatLanguage={formatLanguage}
                onView={() => {
                  setViewing(person);
                }}
                onNotes={() => {
                  setNotesMode(person.activeNoteCount ? 'view' : 'add');
                  setNotesPerson(person);
                }}
                onEdit={() => {
                  setEditing(person);
                }}
                onDelete={() => {
                  setDeleting(person);
                }}
                onReactivate={() => {
                  void reactivate(person);
                }}
              />
            )}
          >
            <thead>
              <tr>
                <th scope="col">{t('persons.admin.person')}</th>
                <th scope="col">{t('common.contact')}</th>
                <th scope="col">{t('persons.personPickerOrCreate.birthDate')}</th>
                <th scope="col">{t('common.language')}</th>
                <th scope="col">{t('common.status')}</th>
                <th scope="col">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((person) => (
                <tr key={person.personId}>
                  <td>
                    <b>{[person.firstName, person.lastName].filter(Boolean).join(' ')}</b>
                    <small>{person.email ?? person.phoneNumber ?? t('common.notProvided')}</small>
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
                      <Button
                        variant="unstyled"
                        className="button button-small"
                        type="button"
                        title={t('common.view')}
                        onClick={() => {
                          setViewing(person);
                        }}
                      >
                        <Eye aria-hidden="true" /> {t('common.view')}
                      </Button>
                      <Button
                        variant="unstyled"
                        className="button button-small"
                        type="button"
                        title={t('common.edit')}
                        onClick={() => {
                          setEditing(person);
                        }}
                      >
                        <Pencil aria-hidden="true" /> {t('common.edit')}
                      </Button>
                      <PersonNotesButton
                        noteCount={person.activeNoteCount}
                        onClick={() => {
                          setNotesMode(person.activeNoteCount ? 'view' : 'add');
                          setNotesPerson(person);
                        }}
                      />
                      {canDelete ? (
                        person.isActive ? (
                          <Button
                            variant="unstyled"
                            className="button button-small button-danger"
                            type="button"
                            title={t('common.delete')}
                            onClick={() => {
                              setDeleting(person);
                            }}
                          >
                            <Trash2 aria-hidden="true" /> {t('common.delete')}
                          </Button>
                        ) : (
                          <Button
                            variant="unstyled"
                            className="button button-small"
                            type="button"
                            title={t('persons.admin.reactivate')}
                            disabled={pending}
                            onClick={() => {
                              void reactivate(person);
                            }}
                          >
                            <RotateCcw aria-hidden="true" /> {t('persons.admin.reactivate')}
                          </Button>
                        )
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
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
          personName={[notesPerson.firstName, notesPerson.lastName].filter(Boolean).join(' ')}
          initialMode={notesMode}
          open
          onOpenChange={(open) => {
            if (!open) setNotesPerson(undefined);
          }}
        />
      ) : null}
      <Modal
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open && !pending) setDeleting(undefined);
        }}
        title={t('persons.admin.deleteTitle')}
        description={
          deleting ? [deleting.firstName, deleting.lastName].filter(Boolean).join(' ') : undefined
        }
        actions={
          <Button
            variant="unstyled"
            className="button button-danger"
            type="button"
            disabled={pending}
            onClick={() => {
              if (!deleting) return;
              setPending(true);
              void deletePerson(deleting.personId)
                .then(async () => {
                  await refresh();
                  notify({ tone: 'success', title: t('persons.admin.deleted') });
                  setDeleting(undefined);
                })
                .catch(notifyError)
                .finally(() => {
                  setPending(false);
                });
            }}
          >
            <Trash2 aria-hidden="true" />
            {t('common.delete')}
          </Button>
        }
      >
        <p className="admin-message">{t('persons.admin.deleteDescription')}</p>
      </Modal>
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
            <Button
              variant="unstyled"
              className="button button-primary"
              type="button"
              onClick={() => {
                setEditing(viewing);
                setViewing(undefined);
              }}
            >
              <Pencil aria-hidden="true" /> {t('common.edit')}
            </Button>
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
                <small>{viewing.email ?? viewing.phoneNumber ?? t('common.notProvided')}</small>
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
