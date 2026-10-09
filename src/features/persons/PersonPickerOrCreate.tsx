import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import type { PersonIdentityDto, PersonResponseDto } from '@/api/generated/models';
import { personsControllerFindPersons } from '@/api/generated/persons/persons';
import { EntityPicker } from '@/design-system/components/EntityPicker';
import { FormField, PhoneInput } from '@/design-system/components/FormField';
import { Pagination } from '@/design-system/components/Pagination';

export type PersonChoice =
  { kind: 'existing'; person: PersonResponseDto } | { kind: 'new'; person: PersonIdentityDto };

export function PersonPickerOrCreate({
  siteId,
  value,
  onChange,
}: {
  siteId: number;
  value: PersonChoice | null;
  onChange: (choice: PersonChoice | null) => void;
}) {
  const { t: __t } = useTranslation();
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<PersonIdentityDto>({
    lastName: '',
    phoneNumber: '',
    firstName: '',
    languagePreference: 'fr',
  });
  const people = useQuery({
    queryKey: ['persons', siteId, search.trim(), page],
    queryFn: () =>
      personsControllerFindPersons({
        siteId,
        search: search.trim(),
        page,
        pageSize: 5,
      }),
    enabled: mode === 'existing' && search.trim().length >= 3,
  });
  const draftIsValid =
    Boolean(draft.lastName.trim()) && /^\+[1-9][0-9]{6,14}$/.test(draft.phoneNumber);
  useEffect(() => {
    if (mode !== 'new') return;
    onChange(draftIsValid ? { kind: 'new', person: draft } : null);
  }, [draft, draftIsValid, mode, onChange]);
  return (
    <div className="person-picker form-stack">
      <div className="segmented">
        <button
          type="button"
          aria-pressed={mode === 'existing'}
          onClick={() => {
            setMode('existing');
            onChange(null);
          }}
        >
          {__t('ui.persons.person_picker_or_create.personne_connue_10o7xp7')}
        </button>
        <button
          type="button"
          aria-pressed={mode === 'new'}
          onClick={() => {
            setMode('new');
            onChange(null);
          }}
        >
          {__t('ui.persons.person_picker_or_create.nouvelle_personne_1mo0xl')}
        </button>
      </div>
      {mode === 'existing' ? (
        <>
          <div className="person-search">
            <FormField
              label={__t('ui.persons.person_picker_or_create.rechercher_une_personne_ger18e')}
            >
              <div className="input-with-action">
                <input
                  value={search}
                  placeholder={__t(
                    'ui.persons.person_picker_or_create.nom_telephone_ou_email_9m7yu9',
                  )}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                    onChange(null);
                  }}
                />
                <span
                  className={
                    people.isFetching ? 'search-indicator is-searching' : 'search-indicator'
                  }
                >
                  <Search aria-hidden="true" />
                </span>
              </div>
            </FormField>
            {search.trim().length > 0 && search.trim().length < 3 ? (
              <small className="form-hint">
                {__t('ui.persons.person_picker_or_create.saisissez_au_moins_3_caracteres_1trlzeu')}
              </small>
            ) : null}
          </div>
          {search.trim().length >= 3 ? (
            <>
              <EntityPicker
                compact
                entities={people.data?.data.items ?? []}
                selectedKey={value?.kind === 'existing' ? value.person.personId : null}
                getKey={(person) => person.personId}
                label={people.isFetching ? 'Recherche en cours…' : 'Résultats'}
                render={(person) =>
                  `${person.firstName} ${person.lastName} — ${person.phoneNumber ?? ''}`
                }
                onSelect={(person) => {
                  onChange({ kind: 'existing', person });
                }}
              />
              {(people.data?.data.totalPages ?? 0) > 1 ? (
                <Pagination
                  page={people.data?.data.page ?? page}
                  totalPages={people.data?.data.totalPages ?? 1}
                  onPageChange={setPage}
                />
              ) : null}
            </>
          ) : null}
        </>
      ) : (
        <div className="person-create-grid">
          <FormField label={__t('ui.persons.person_picker_or_create.nom_15eqct1')} required>
            <input
              autoComplete="family-name"
              value={draft.lastName}
              onChange={(e) => {
                setDraft({ ...draft, lastName: e.target.value });
              }}
            />
          </FormField>
          <FormField label={__t('ui.persons.person_picker_or_create.prenom_h4ba4')}>
            <input
              autoComplete="given-name"
              value={draft.firstName}
              onChange={(e) => {
                setDraft({ ...draft, firstName: e.target.value });
              }}
            />
          </FormField>
          <FormField
            label={__t('ui.persons.person_picker_or_create.telephone_e_164_jltmzn')}
            required
          >
            <PhoneInput
              value={draft.phoneNumber}
              onChange={(e) => {
                setDraft({ ...draft, phoneNumber: e.target.value });
              }}
            />
          </FormField>
          <FormField label={__t('ui.persons.person_picker_or_create.email')}>
            <input
              type="email"
              autoComplete="email"
              value={draft.email ?? ''}
              onChange={(e) => {
                setDraft({ ...draft, email: e.target.value || undefined });
              }}
            />
          </FormField>
          <FormField label={__t('ui.persons.person_picker_or_create.birthDate')}>
            <input
              type="date"
              autoComplete="bday"
              value={draft.birthDate ?? ''}
              onChange={(e) => {
                setDraft({ ...draft, birthDate: e.target.value || undefined });
              }}
            />
          </FormField>
          <FormField label={__t('ui.persons.person_picker_or_create.languagePreference')}>
            <select
              value={draft.languagePreference ?? ''}
              onChange={(e) => {
                setDraft({ ...draft, languagePreference: e.target.value || undefined });
              }}
            >
              <option value="fr">{__t('ui.persons.person_picker_or_create.language.fr')}</option>
              <option value="en">{__t('ui.persons.person_picker_or_create.language.en')}</option>
              <option value="ar">{__t('ui.persons.person_picker_or_create.language.ar')}</option>
            </select>
          </FormField>
          <p
            className={`person-create-status ${draftIsValid ? 'form-valid-hint' : 'form-hint'}`}
            role="status"
          >
            {draftIsValid
              ? __t(
                  'ui.expression.persons.person_picker_or_create.informations_valides_vous_pouvez_continuer_1myt7p9',
                )
              : __t(
                  'ui.expression.persons.person_picker_or_create.renseignez_un_nom_et_un_telephone_au_format__gar0el',
                )}
          </p>
        </div>
      )}
    </div>
  );
}
