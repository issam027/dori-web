import { useTranslation } from 'react-i18next';
import { Eye, Pencil, Archive } from 'lucide-react';
import type { AnnouncementResponseDto } from '@/api/generated/models';
import { Button } from '@/design-system/components/Button';
import { MobileCardActionsMenu } from '@/design-system/components/MobileCardActionsMenu';

export function AnnouncementActions({
  item,
  mobile = false,
  onView,
  onEdit,
  onWithdraw,
}: {
  item: AnnouncementResponseDto;
  mobile?: boolean;
  onView: () => void;
  onEdit: () => void;
  onWithdraw: () => void;
}) {
  const { t } = useTranslation();
  const manage = [
    item.canEdit ? (
      <Button
        key="edit"
        size="small"
        labelMode="always"
        icon={<Pencil />}
        label={t('common.edit')}
        title={t('common.edit')}
        onClick={onEdit}
      />
    ) : null,
    item.canWithdraw ? (
      <Button
        key="withdraw"
        size="small"
        labelMode="always"
        variant="danger"
        icon={<Archive />}
        label={t('announcements.withdraw')}
        title={t('announcements.withdraw')}
        onClick={onWithdraw}
      />
    ) : null,
  ];
  return (
    <>
      <Button
        size="small"
        labelMode="always"
        icon={<Eye />}
        label={t('common.view')}
        title={t('common.view')}
        onClick={onView}
      />
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
