import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { PersonIdentityDto, PersonResponseDto } from '@/api/generated/models';
import { personsControllerFindPersons } from '@/api/generated/persons/persons';
import { EntityPicker } from '@/design-system/components/EntityPicker';
import { FormField, PhoneInput } from '@/design-system/components/FormField';

export type PersonChoice =
  { kind: 'existing'; person: PersonResponseDto } | { kind: 'new'; person: PersonIdentityDto };

export function PersonPickerOrCreate({
  siteId,
  value,
  onChange,
}: {
  siteId: number;
  value: PersonChoice | null;
  onChange: (choice: PersonChoice) => void;
}) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<PersonIdentityDto>({
    lastName: '',
    phoneNumber: '',
    firstName: '',
    languagePreference: 'fr',
  });
  const people = useQuery({
    queryKey: ['persons', siteId, search],
    queryFn: () =>
      personsControllerFindPersons({ siteId, search: search || undefined, page: 1, pageSize: 20 }),
    enabled: mode === 'existing',
  });
  return (
    <fieldset className="form-stack">
      <legend>Personne</legend>
      <div className="segmented">
        <button
          type="button"
          aria-pressed={mode === 'existing'}
          onClick={() => {
            setMode('existing');
          }}
        >
          Personne connue
        </button>
        <button
          type="button"
          aria-pressed={mode === 'new'}
          onClick={() => {
            setMode('new');
          }}
        >
          Nouvelle personne
        </button>
      </div>
      {mode === 'existing' ? (
        <>
          <FormField label="Rechercher">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
            />
          </FormField>
          <EntityPicker
            entities={people.data?.data.items ?? []}
            selectedKey={value?.kind === 'existing' ? value.person.personId : null}
            getKey={(person) => person.personId}
            label="Résultats"
            render={(person) =>
              `${person.firstName} ${person.lastName} — ${person.phoneNumber ?? ''}`
            }
            onSelect={(person) => {
              onChange({ kind: 'existing', person });
            }}
          />
        </>
      ) : (
        <>
          <FormField label="Nom" required>
            <input
              value={draft.lastName}
              onChange={(e) => {
                setDraft({ ...draft, lastName: e.target.value });
              }}
            />
          </FormField>
          <FormField label="Prénom">
            <input
              value={draft.firstName}
              onChange={(e) => {
                setDraft({ ...draft, firstName: e.target.value });
              }}
            />
          </FormField>
          <FormField label="Téléphone E.164" required>
            <PhoneInput
              value={draft.phoneNumber}
              onChange={(e) => {
                setDraft({ ...draft, phoneNumber: e.target.value });
              }}
            />
          </FormField>
          <button
            className="button"
            type="button"
            disabled={!draft.lastName || !/^\+[1-9][0-9]{6,14}$/.test(draft.phoneNumber)}
            onClick={() => {
              onChange({ kind: 'new', person: draft });
            }}
          >
            Utiliser cette personne
          </button>
        </>
      )}
    </fieldset>
  );
}
