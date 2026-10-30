import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, UserRound } from 'lucide-react';
import type { CreatePersonDto, PersonResponseDto, UpdatePersonDto } from '@/api/generated/models';
import { InternationalPhoneInput } from '@/design-system/components/InternationalPhoneInput';
import { Modal } from '@/design-system/components/Modal';
import { isValidPersonIdentity } from './person-validation';
import { normalizePersonText } from './person-display';
import { Button } from '@/design-system/components/Button';

interface PersonForm {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  languagePreference: string;
}

const emptyForm: PersonForm = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  birthDate: '',
  languagePreference: 'fr',
};

export function PersonFormModal({
  open,
  person,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  person?: PersonResponseDto;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: CreatePersonDto | UpdatePersonDto) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<PersonForm>(() =>
    person
      ? {
          firstName: normalizePersonText(person.firstName),
          lastName: normalizePersonText(person.lastName),
          email: normalizePersonText(person.email),
          phoneNumber: normalizePersonText(person.phoneNumber),
          birthDate: normalizePersonText(person.birthDate).slice(0, 10),
          languagePreference: normalizePersonText(person.preferredLanguage) || 'fr',
        }
      : emptyForm,
  );

  const valid = isValidPersonIdentity({
    firstName: form.firstName || undefined,
    lastName: form.lastName,
    email: form.email || undefined,
    phoneNumber: form.phoneNumber,
    birthDate: form.birthDate || undefined,
    languagePreference: form.languagePreference,
  });

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
      title={t(person ? 'persons.admin.editTitle' : 'persons.admin.createTitle')}
      description={t(person ? 'persons.admin.editDescription' : 'persons.admin.createDescription')}
      actions={
        <Button
          variant="unstyled"
          className="button button-primary"
          type="button"
          disabled={!valid || pending}
          onClick={() => {
            onSubmit({
              firstName: form.firstName.trim() || undefined,
              lastName: form.lastName.trim(),
              email: form.email.trim() || undefined,
              phoneNumber: form.phoneNumber,
              birthDate: form.birthDate || undefined,
              languagePreference: form.languagePreference,
            });
          }}
        >
          <Save aria-hidden="true" />
          {pending ? t('common.saving') : t('common.save')}
        </Button>
      }
    >
      <div className="translation-modal-intro">
        <span>
          <UserRound aria-hidden="true" />
        </span>
        <div>
          <strong>{t('persons.admin.identity')}</strong>
          <small>{t('persons.admin.formHint')}</small>
        </div>
      </div>
      <div className="form-grid">
        <label>
          <span>
            {t('common.name')}{' '}
            <span className="required-mark" aria-hidden="true">
              *
            </span>
          </span>
          <input
            required
            autoComplete="family-name"
            value={form.lastName}
            onChange={(event) => {
              setForm({ ...form, lastName: event.target.value });
            }}
          />
        </label>
        <label>
          {t('common.firstName')}
          <input
            value={form.firstName}
            autoComplete="given-name"
            onChange={(event) => {
              setForm({ ...form, firstName: event.target.value });
            }}
          />
        </label>
        <label>
          <span>
            {t('common.phone')}{' '}
            <span className="required-mark" aria-hidden="true">
              *
            </span>
          </span>
          <InternationalPhoneInput
            required
            value={form.phoneNumber}
            countryLabel={t('phone.countryCode')}
            phoneLabel={t('common.phone')}
            onChange={(phoneNumber) => {
              setForm({ ...form, phoneNumber });
            }}
          />
        </label>
        <label>
          {t('common.email')}
          <input
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => {
              setForm({ ...form, email: event.target.value });
            }}
          />
        </label>
        <label>
          {t('persons.personPickerOrCreate.birthDate')}
          <input
            type="date"
            autoComplete="bday"
            value={form.birthDate}
            onChange={(event) => {
              setForm({ ...form, birthDate: event.target.value });
            }}
          />
        </label>
        <label>
          {t('persons.personPickerOrCreate.languagePreference')}
          <select
            value={form.languagePreference}
            onChange={(event) => {
              setForm({ ...form, languagePreference: event.target.value });
            }}
          >
            <option value="fr">{t('locale.fr')}</option>
            <option value="en">{t('locale.en')}</option>
            <option value="ar">{t('locale.ar')}</option>
            <option value="ar-TN">{t('locale.ar-TN')}</option>
          </select>
        </label>
      </div>
    </Modal>
  );
}
