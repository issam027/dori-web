import { Plus, StickyNote } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/design-system/components/Button';

export function PersonNotesButton({
  noteCount,
  onClick,
}: {
  noteCount: number | null | undefined;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const count = Math.max(0, noteCount ?? 0);
  const accessibleLabel = count
    ? t('queues.myQueues.viewNotes', { count })
    : t('queues.myQueues.addNote');

  return (
    <Button variant="unstyled"
      aria-label={accessibleLabel}
      className="button button-small person-notes-button"
      type="button"
      title={accessibleLabel}
      onClick={onClick}
    >
      {count ? <StickyNote aria-hidden="true" /> : <Plus aria-hidden="true" />}
      <span>{t('persons.admin.notes')}</span>
      <span
        aria-hidden="true"
        className={`note-count${count === 0 ? ' note-count-empty' : ''}`}
      >
        {count}
      </span>
    </Button>
  );
}
