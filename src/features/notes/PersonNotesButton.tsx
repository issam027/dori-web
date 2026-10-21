import { Plus, StickyNote } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/design-system/components/Button';

export function PersonNotesButton({
  noteCount,
  onClick,
  variant = 'default',
  className,
}: {
  noteCount: number | null | undefined;
  onClick: () => void;
  variant?: 'default' | 'cockpit';
  className?: string;
}) {
  const { t } = useTranslation();
  const count = Math.max(0, noteCount ?? 0);
  const accessibleLabel = count
    ? t('queues.myQueues.viewNotes', { count })
    : t('queues.myQueues.addNote');
  const cockpit = variant === 'cockpit';

  return (
    <Button
      size={cockpit ? 'default' : 'small'}
      aria-label={accessibleLabel}
      className={className}
      type="button"
      title={accessibleLabel}
      onClick={onClick}
    >
      {cockpit || count ? <StickyNote aria-hidden="true" /> : <Plus aria-hidden="true" />}
      <span className={cockpit ? 'button-label' : undefined}>
        {cockpit ? t('queue-operations.desk.consulterLesNotes') : t('persons.admin.notes')}
      </span>
      <span
        aria-hidden="true"
        className={`note-count${cockpit ? '' : ' note-count-compact'}${count === 0 ? ' note-count-empty' : ''}`}
      >
        {count}
      </span>
    </Button>
  );
}
