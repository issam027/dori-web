import { useTranslation } from 'react-i18next';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import type { AnnouncementResponseDto } from '@/api/generated/models';
import { Button } from '@/design-system/components/Button';
import { MobileCardActionsMenu } from '@/design-system/components/MobileCardActionsMenu';

export function AnnouncementActions({
  item,
  mobile = false,
  onView,
  onEdit,
  onDelete,
}: {
  item: AnnouncementResponseDto;
  mobile?: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const manage = [
    item.canEdit ? (
      <Button key="edit" size="small" icon={<Pencil />} label={t('common.edit')} onClick={onEdit} />
    ) : null,
    item.canWithdraw ? (
      <Button
        key="delete"
        size="small"
        variant="danger"
        icon={<Trash2 />}
        label={t('common.delete')}
        onClick={onDelete}
      />
    ) : null,
  ];
  return (
    <>
      <Button size="small" icon={<Eye />} label={t('common.view')} onClick={onView} />
      {mobile ? (
        item.canEdit || item.canWithdraw ? (
          <MobileCardActionsMenu label={t('common.actions')}>{manage}</MobileCardActionsMenu>
        ) : null
      ) : (
        manage
      )}
    </>
  );
}
