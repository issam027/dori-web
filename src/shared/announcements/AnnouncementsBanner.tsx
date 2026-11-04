import { AlertCircle, Info, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AnnouncementItemDto } from '@/api/generated/models';
import { useVisibleAnnouncements } from './announcements-context';
import './announcements.css';

export function AnnouncementNotice({
  announcement,
}: {
  announcement: Pick<AnnouncementItemDto, 'title' | 'message' | 'severity'>;
}) {
  const { t } = useTranslation();
  const Icon =
    announcement.severity === 'critical'
      ? AlertCircle
      : announcement.severity === 'warning'
        ? TriangleAlert
        : Info;
  return (
    <article
      className={`announcement-notice is-${announcement.severity}`}
      role={announcement.severity === 'critical' ? 'alert' : undefined}
    >
      <Icon aria-hidden="true" />
      <div className="announcement-notice-content">
        <div className="announcement-notice-heading">
          <strong>
            <bdi dir="auto">{announcement.title}</bdi>
          </strong>
          <span>{t(`announcements.severity.${announcement.severity}`)}</span>
        </div>
        <p>
          <bdi dir="auto">{announcement.message}</bdi>
        </p>
      </div>
    </article>
  );
}
export function AnnouncementsBanner() {
  const { t } = useTranslation();
  const items = useVisibleAnnouncements();
  if (!items.length) return null;
  return (
    <section
      className="installation-announcements"
      aria-label={t('announcements.banner')}
      aria-live="polite"
    >
      {items.map((item) => (
        <AnnouncementNotice key={item.announcementId} announcement={item} />
      ))}
    </section>
  );
}
