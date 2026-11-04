import { useTranslation } from 'react-i18next';
import { Button } from '@/design-system/components/Button';
import { Modal } from '@/design-system/components/Modal';
import { ErrorState } from '@/design-system/components/FeedbackState';
import { DorifyLoader } from '@/design-system/components/DorifyLoader';
import { formatDateTime } from '@/core/i18n/date-format';
import { AnnouncementNotice } from '@/shared/announcements/AnnouncementsBanner';
import { useAnnouncement } from './use-announcements';
import { AnnouncementStatus } from './AnnouncementBadges';

export function AnnouncementDetails({
  id,
  onClose,
  onEdit,
}: {
  id: string;
  onClose: () => void;
  onEdit: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const query = useAnnouncement(id);
  const item = query.data?.data;
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t('common.view')}
      description={item?.title}
      actions={
        item?.canEdit ? (
          <Button
            label={t('common.edit')}
            onClick={() => {
              onEdit(id);
            }}
          />
        ) : undefined
      }
    >
      {query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : !item ? (
        <DorifyLoader compact />
      ) : (
        <div className="form-stack">
          <AnnouncementNotice announcement={item} />
          <AnnouncementStatus item={item} />
          <dl className="announcement-detail-fields">
            <div>
              <dt>{t(`announcements.scope.${item.scope}`)}</dt>
              <dd>
                {item.targets.map((target) => (
                  <bdi key={target.targetId} dir="auto">
                    {target.name}
                  </bdi>
                ))}
              </dd>
            </div>
            <div>
              <dt>{t('announcements.startsAt')}</dt>
              <dd>{formatDateTime(item.startsAt, i18n.language)}</dd>
            </div>
            <div>
              <dt>{t('announcements.endsAt')}</dt>
              <dd>{formatDateTime(item.endsAt, i18n.language)}</dd>
            </div>
          </dl>
          {!item.canWithdraw && item.status !== 'withdrawn' ? (
            <p>{t('announcements.readOnly')}</p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
