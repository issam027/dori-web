import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import type { PersonIdentityDto, PersonResponseDto } from '@/api/generated/models';
import { EntityPicker } from '@/design-system/components/EntityPicker';
import { FormField } from '@/design-system/components/FormField';
import { InternationalPhoneInput } from '@/design-system/components/InternationalPhoneInput';
import { Pagination } from '@/design-system/components/Pagination';
import { isValidPersonIdentity } from './person-validation';
import { usePersonsSearch } from './hooks/usePersons';

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
  const people = usePersonsSearch({
    siteId,
    search,
    page,
    pageSize: 5,
    usage: 'picker',
    enabled: mode === 'existing',
  });
  const draftIsValid = isValidPersonIdentity(draft);
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
          {__t('persons.personPickerOrCreate.personneConnue')}
        </button>
        <button
          type="button"
          aria-pressed={mode === 'new'}
          onClick={() => {
            setMode('new');
            onChange(null);
          }}
        >
          {__t('common.nouvellePersonne')}
        </button>
      </div>
      {mode === 'existing' ? (
        <>
          <div className="person-search">
            <FormField label={__t('common.rechercherUnePersonne')}>
              <div className="input-with-action">
                <input
                  value={search}
                  placeholder={__t('persons.personPickerOrCreate.nomTelephoneOuEmail')}
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
              <small className="form-hint">{__t('persons.search.minimumCharacters')}</small>
            ) : null}
          </div>
          {search.trim().length >= 3 ? (
            <>
              <EntityPicker
                compact
                entities={people.data?.data.items ?? []}
                selectedKey={value?.kind === 'existing' ? value.person.personId : null}
                getKey={(person) => person.personId}
                label={people.isFetching ? __t('common.searching') : __t('common.results')}
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
          <FormField label={__t('common.name')} required>
            <input
              autoComplete="family-name"
              value={draft.lastName}
              onChange={(e) => {
                setDraft({ ...draft, lastName: e.target.value });
              }}
            />
          </FormField>
          <FormField label={__t('common.firstName')}>
            <input
              autoComplete="given-name"
              value={draft.firstName}
              onChange={(e) => {
                setDraft({ ...draft, firstName: e.target.value });
              }}
            />
          </FormField>
          <FormField label={__t('persons.phone.e164Label')} required>
            <InternationalPhoneInput
              value={draft.phoneNumber}
              countryLabel={__t('phone.countryCode')}
              phoneLabel={__t('persons.phone.e164Label')}
              required
              onChange={(phoneNumber) => {
                setDraft({ ...draft, phoneNumber });
              }}
            />
          </FormField>
          <FormField label={__t('persons.personPickerOrCreate.email')}>
            <input
              type="email"
              autoComplete="email"
              value={draft.email ?? ''}
              onChange={(e) => {
                setDraft({ ...draft, email: e.target.value || undefined });
              }}
            />
          </FormField>
          <FormField label={__t('persons.personPickerOrCreate.birthDate')}>
            <input
              type="date"
              autoComplete="bday"
              value={draft.birthDate ?? ''}
              onChange={(e) => {
                setDraft({ ...draft, birthDate: e.target.value || undefined });
              }}
            />
          </FormField>
          <FormField label={__t('common.language')}>
            <select
              value={draft.languagePreference ?? ''}
              onChange={(e) => {
                setDraft({ ...draft, languagePreference: e.target.value || undefined });
              }}
            >
              <option value="fr">{__t('locale.fr')}</option>
              <option value="en">{__t('locale.en')}</option>
              <option value="ar">{__t('locale.ar')}</option>
            </select>
          </FormField>
          <p
            className={`person-create-status ${draftIsValid ? 'form-valid-hint' : 'form-hint'}`}
            role="status"
          >
            {draftIsValid
              ? __t('persons.personPickerOrCreate.informationsValidesVousPouvezContinuer')
              : __t('persons.personPickerOrCreate.renseignezUnNomEtUnTelephoneAuFormat')}
          </p>
        </div>
      )}
    </div>
  );
}
