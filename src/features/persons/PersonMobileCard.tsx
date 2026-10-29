import { useTranslation } from 'react-i18next';
import { Eye, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import type { PersonResponseDto } from '@/api/generated/models';
import { Button } from '@/design-system/components/Button';
import { DataTableMobileCard } from '@/design-system/components/DataTableMobileCard';
import { MobileCardActionsMenu } from '@/design-system/components/MobileCardActionsMenu';
import { PersonNotesButton } from '@/features/notes/PersonNotesButton';

interface PersonMobileCardProps {
  person: PersonResponseDto;
  canDelete: boolean;
  pending: boolean;
  formatDate: (value?: string | null) => string;
  formatLanguage: (value?: string | null) => string;
  onView: () => void;
  onNotes: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReactivate: () => void;
}

export function PersonMobileCard(props: PersonMobileCardProps) {
  const { t } = useTranslation();
  const { person } = props;
  return (
    <DataTableMobileCard
      className="person-mobile-card"
      title={[person.firstName, person.lastName].filter(Boolean).join(' ')}
      subtitle={person.email ?? person.phoneNumber ?? t('common.notProvided')}
      badge={
        <span className={`status-badge ${person.isActive ? 'status-success' : 'status-warning'}`}>
          {t(person.isActive ? 'common.active' : 'common.inactive')}
        </span>
      }
      fields={[
        {
          label: t('common.contact'),
          value: (
            <>
              {person.phoneNumber ?? t('common.notProvided')}
              <br />
              {person.email ?? t('settings.noEmail')}
            </>
          ),
          wide: true,
        },
        {
          label: t('persons.personPickerOrCreate.birthDate'),
          value: props.formatDate(person.birthDate),
        },
        { label: t('common.language'), value: props.formatLanguage(person.preferredLanguage) },
      ]}
      actions={
        <>
          <Button size="small" type="button" onClick={props.onView}>
            <Eye aria-hidden="true" />
            {t('common.view')}
          </Button>
          <PersonNotesButton
            className="button button-small"
            noteCount={person.activeNoteCount}
            onClick={props.onNotes}
          />
          <MobileCardActionsMenu label={t('common.actions')}>
            <Button size="small" type="button" onClick={props.onEdit}>
              <Pencil />
              {t('common.edit')}
            </Button>
            {props.canDelete ? (
              person.isActive ? (
                <Button variant="danger" size="small" type="button" onClick={props.onDelete}>
                  <Trash2 />
                  {t('common.delete')}
                </Button>
              ) : (
                <Button
                  size="small"
                  type="button"
                  disabled={props.pending}
                  onClick={props.onReactivate}
                >
                  <RotateCcw />
                  {t('persons.admin.reactivate')}
                </Button>
              )
            ) : null}
          </MobileCardActionsMenu>
        </>
      }
    />
  );
}
