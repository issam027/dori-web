import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Languages, Pencil, Plus, RotateCcw, Save, Search, Trash2 } from 'lucide-react';
import type {
  CreateTranslationDto,
  TranslationResponseDto,
  TranslationsControllerFindTranslationsParams,
} from '@/api/generated/models';
import { CreateTranslationDtoCategory } from '@/api/generated/models';
import { Card } from '@/design-system/components/Card';
import { ConfirmDialog, Modal } from '@/design-system/components/Modal';
import { PageHeader } from '@/design-system/components/PageHeader';
import { Pagination } from '@/design-system/components/Pagination';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { loadTranslationBundle } from '@/core/i18n/i18n';
import {
  createTranslation,
  deleteTranslation,
  findTranslations,
  updateTranslation,
} from './api/onboarding-api';

const PAGE_SIZE = 10;
const TRANSLATION_CATEGORIES = Object.values(CreateTranslationDtoCategory);
type Form = {
  key: string;
  category: CreateTranslationDto['category'];
  locale: string;
  content: string;
  contents: Record<'fr' | 'en' | 'ar', string>;
  params: string;
  active: boolean;
};
const emptyForm = (): Form => ({
  key: '',
  category: 'ihm',
  locale: 'fr',
  content: '',
  contents: { fr: '', en: '', ar: '' },
  params: '',
  active: true,
});

export function TranslationsAdminPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filterDraft, setFilterDraft] = useState({ key: '', category: '', locale: '' });
  const [filters, setFilters] = useState(filterDraft);
  const [editing, setEditing] = useState<TranslationResponseDto>();
  const [deleting, setDeleting] = useState<TranslationResponseDto>();
  const [form, setForm] = useState<Form>(emptyForm);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [createLocale, setCreateLocale] = useState<'fr' | 'en' | 'ar'>('fr');
  const categoryLabel = (category: CreateTranslationDto['category']) =>
    t(`admin.translations.categories.${category}`);
  const translations = useQuery({
    queryKey: ['admin', 'translations-page', page, filters],
    queryFn: ({ signal }) =>
      findTranslations(
        {
          page,
          pageSize: PAGE_SIZE,
          sort: 'translationKey:asc',
          key: filters.key || undefined,
          category: (filters.category ||
            undefined) as TranslationsControllerFindTranslationsParams['category'],
          locale: filters.locale || undefined,
        },
        undefined,
        signal,
      ),
  });
  const items = translations.data?.data.items ?? [];
  const totalPages = Math.max(1, translations.data?.data.totalPages ?? 1);
  const showCreate = () => {
    setEditing(undefined);
    setForm(emptyForm());
    setCreateLocale('fr');
    setOpen(true);
  };
  const showEdit = (item: TranslationResponseDto) => {
    setEditing(item);
    setForm({
      key: item.translationKey,
      category: item.category,
      locale: item.locale,
      content: item.content,
      contents: { fr: '', en: '', ar: '' },
      params: item.expectedParams?.join(', ') ?? '',
      active: item.isActive,
    });
    setOpen(true);
  };
  const save = async () => {
    setPending(true);
    const expectedParams = form.params
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    try {
      if (editing)
        await updateTranslation(editing.translationId, {
          content: form.content,
          expectedParams,
          isActive: form.active,
        });
      else
        await Promise.all(
          (['fr', 'en', 'ar'] as const).map((locale) =>
            createTranslation({
              translationKey: form.key.trim(),
              category: form.category,
              locale,
              content: form.contents[locale].trim(),
              expectedParams,
            }),
          ),
        );
      await queryClient.invalidateQueries({ queryKey: ['admin', 'translations-page'] });
      if (form.category === 'ihm') {
        const activeLocale = (i18n.resolvedLanguage ?? i18n.language).split('-')[0] ?? 'fr';
        const locale = editing ? form.locale : activeLocale;
        const content = editing
          ? form.content
          : form.contents[activeLocale as keyof typeof form.contents];
        if (locale === activeLocale && content.trim()) {
          i18n.addResource(activeLocale, 'translation', form.key.trim(), content.trim());
        }
      }
      notify({
        tone: 'success',
        title: editing
          ? t('admin.translations.updateSuccess')
          : t('admin.translations.createSuccess'),
        message: editing ? form.key : t('admin.translations.createdLocales', { key: form.key }),
      });
      setOpen(false);
    } catch (error) {
      notifyError(error);
    } finally {
      setPending(false);
    }
  };
  const remove = async () => {
    if (!deleting) return;
    setPending(true);
    try {
      await deleteTranslation(deleting.translationId);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'translations-page'] });
      const activeLocale = (i18n.resolvedLanguage ?? i18n.language).split('-')[0] ?? 'fr';
      if (deleting.category === 'ihm' && deleting.locale === activeLocale) {
        await loadTranslationBundle(activeLocale, 'ihm', true);
      }
      notify({
        tone: 'success',
        title: t('admin.translations.delete.successTitle'),
        message: t('admin.translations.delete.successMessage', { key: deleting.translationKey }),
      });
      setDeleting(undefined);
    } catch (error) {
      notifyError(error);
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="page-stack admin-page translations-admin-page">
      <PageHeader
        eyebrow={t('common.administration')}
        title={t('onboarding.settings.traductions')}
        description={t('admin.translations.pageDescription')}
        actions={
          <button className="button button-primary" type="button" onClick={showCreate}>
            <Plus /> {t('onboarding.settings.nouvelleTraduction')}
          </button>
        }
      />
      <Card className="admin-filter-card">
        <details>
          <summary>
            <span>
              <Search /> {t('admin.translations.rechercherDansLesTraductions')}
            </span>
            <small>{t('admin.translations.cleCategorieOuLangue')}</small>
          </summary>
          <form
            className="admin-filter-grid"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setFilters(filterDraft);
            }}
          >
            <label>
              {t('onboarding.settings.cle')}
              <input
                value={filterDraft.key}
                onChange={(event) => {
                  setFilterDraft({ ...filterDraft, key: event.target.value });
                }}
              />
            </label>
            <label>
              {t('onboarding.settings.categorie')}
              <select
                value={filterDraft.category}
                onChange={(event) => {
                  setFilterDraft({ ...filterDraft, category: event.target.value });
                }}
              >
                <option value="">{t('profile.profile.toutes')}</option>
                {TRANSLATION_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{categoryLabel(category)}</option>
                ))}
              </select>
            </label>
            <label>
              {t('common.language')}
              <input
                value={filterDraft.locale}
                placeholder={t('common.fr')}
                maxLength={10}
                onChange={(event) => {
                  setFilterDraft({ ...filterDraft, locale: event.target.value });
                }}
              />
            </label>
            <div className="admin-filter-actions">
              <button
                className="button"
                type="button"
                onClick={() => {
                  const empty = { key: '', category: '', locale: '' };
                  setFilterDraft(empty);
                  setFilters(empty);
                  setPage(1);
                }}
              >
                <RotateCcw /> {t('admin.translations.reinitialiser')}
              </button>
              <button className="button button-primary" type="submit">
                <Search /> {t('public-experiences.track.appliquer')}
              </button>
            </div>
          </form>
        </details>
      </Card>{' '}
      <Card className="settings-card">
        <div className="card-heading">
          <div>
            <span className="translation-heading-icon">
              <Languages />
            </span>
            <h2>{t('admin.translations.catalogueDesTraductions')}</h2>
            <p>{t('admin.translations.remoteOverrideNotice')}</p>
          </div>
        </div>
        <div className="table-wrap admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('onboarding.settings.cle')}</th>
                <th>{t('onboarding.settings.categorie')}</th>
                <th>{t('common.language')}</th>
                <th>{t('common.contenu')}</th>
                <th>{t('common.etat')}</th>
                <th>{t('onboarding.settings.action')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.translationId}>
                  <td>
                    <code>{item.translationKey}</code>
                  </td>
                  <td>
                    <span className="status-badge status-info">{categoryLabel(item.category)}</span>
                  </td>
                  <td>{item.locale.toUpperCase()}</td>
                  <td className="translation-content-cell">{item.content}</td>
                  <td>
                    <span className={`status-badge ${item.isActive ? 'status-success' : ''}`}>
                      {item.isActive
                        ? t('admin.translations.active')
                        : t('admin.translations.inactive')}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions responsive-table-actions">
                      <button
                        className="button button-small"
                        type="button"
                        title={t('common.edit')}
                        onClick={() => {
                          showEdit(item);
                        }}
                      >
                        <Pencil aria-hidden="true" /> {t('common.edit')}
                      </button>
                      <button
                        className="button button-small button-danger"
                        type="button"
                        title={t('common.delete')}
                        onClick={() => {
                          setDeleting(item);
                        }}
                      >
                        <Trash2 aria-hidden="true" /> {t('common.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 ? (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        ) : null}
      </Card>
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(next) => {
          if (!next && !pending) setDeleting(undefined);
        }}
        title={t('admin.translations.delete.title')}
        description={t('admin.translations.delete.description', {
          key: deleting?.translationKey ?? '',
          locale: deleting?.locale.toUpperCase() ?? '',
        })}
        confirmLabel={t('admin.translations.delete.confirm')}
        destructive
        onConfirm={() => void remove()}
      />
      <Modal
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
        title={editing ? t('admin.translations.editTitle') : t('admin.translations.createTitle')}
        description={
          editing
            ? t('admin.translations.editDescription')
            : t('admin.translations.createDescription')
        }
        actions={
          <>
            <button
              className="button button-primary"
              type="button"
              disabled={
                pending ||
                !form.key.trim() ||
                (editing
                  ? !form.locale.trim() || !form.content.trim()
                  : Object.values(form.contents).some((content) => !content.trim()))
              }
              onClick={() => void save()}
            >
              <Save /> {t('common.save')}
            </button>
          </>
        }
      >
        <div className="translation-modal-intro">
          <span>
            <Languages />
          </span>
          <div>
            <strong>{editing ? form.key : t('admin.translations.newKey')}</strong>
            <small>{t('admin.translations.scopeDynamiqueDeTraductionDorify')}</small>
          </div>
        </div>
        <div className="form-grid">
          <label>
            {t('onboarding.settings.cle')}
            <input
              value={form.key}
              disabled={Boolean(editing)}
              onChange={(event) => {
                setForm({ ...form, key: event.target.value });
              }}
            />
          </label>
          <label>
            {t('onboarding.settings.categorie')}
            <select
              value={form.category}
              disabled={Boolean(editing)}
              onChange={(event) => {
                setForm({ ...form, category: event.target.value as Form['category'] });
              }}
            >
              {TRANSLATION_CATEGORIES.map((category) => (
                <option key={category} value={category}>{categoryLabel(category)}</option>
              ))}
            </select>
          </label>
          {editing ? (
            <label>
              {t('common.language')}
              <input value={form.locale} disabled />
            </label>
          ) : null}
          <label>
            {t('admin.translations.parametresAttendus')}
            <input
              value={form.params}
              placeholder={t('onboarding.settings.ticketPosition')}
              onChange={(event) => {
                setForm({ ...form, params: event.target.value });
              }}
            />
          </label>
          {editing ? (
            <label className="form-span">
              {t('common.contenu')}
              <textarea
                rows={6}
                value={form.content}
                onChange={(event) => {
                  setForm({ ...form, content: event.target.value });
                }}
              />
            </label>
          ) : (
            <section className="form-span translation-language-editor">
              <div className="translation-language-heading">
                <div>
                  <strong>{t('admin.translations.contenusParLangue')}</strong>
                  <small>{t('admin.translations.saisissezChaqueVersionAvantDEnregistrer.')}</small>
                </div>
                <span>
                  {Object.values(form.contents).filter((content) => content.trim()).length}
                  {t('admin.translations.textCompletees')}
                </span>
              </div>
              <div
                className="translation-language-tabs"
                role="tablist"
                aria-label={t('admin.translations.langueASaisir')}
              >
                {(
                  [
                    ['fr', '\u{1F1EB}\u{1F1F7}', 'locale.fr'],
                    ['en', '\u{1F1EC}\u{1F1E7}', 'locale.en'],
                    ['ar', '\u{1F1F9}\u{1F1F3}', 'locale.ar'],
                  ] as const
                ).map(([locale, flag, label]) => {
                  const completed = Boolean(form.contents[locale].trim());
                  return (
                    <button
                      key={locale}
                      type="button"
                      role="tab"
                      aria-selected={createLocale === locale}
                      className={createLocale === locale ? 'is-active' : ''}
                      onClick={() => {
                        setCreateLocale(locale);
                      }}
                    >
                      <span aria-hidden="true">{flag}</span>
                      <span>
                        <strong>{t(label)}</strong>
                        <small>{locale.toUpperCase()}</small>
                      </span>
                      {completed ? (
                        <Check aria-label={t('admin.translations.saisieComplete')} />
                      ) : (
                        <i aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
              <label className="translation-active-content">
                <span>
                  {createLocale === 'fr'
                    ? t('admin.translations.frenchText')
                    : createLocale === 'en'
                      ? t('admin.translations.englishText')
                      : t('admin.translations.arabicText')}
                </span>
                <textarea
                  rows={6}
                  autoFocus
                  dir={createLocale === 'ar' ? 'rtl' : 'ltr'}
                  value={form.contents[createLocale]}
                  onChange={(event) => {
                    setForm({
                      ...form,
                      contents: { ...form.contents, [createLocale]: event.target.value },
                    });
                  }}
                />
              </label>
            </section>
          )}
          {editing ? (
            <label className="check-row form-span">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => {
                  setForm({ ...form, active: event.target.checked });
                }}
              />{' '}
              {t('admin.translations.traductionActive')}
            </label>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
