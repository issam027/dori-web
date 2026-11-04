import { useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import type { CreateAnnouncementDto } from '@/api/generated/models';
import { Button } from '@/design-system/components/Button';
import { Modal } from '@/design-system/components/Modal';
import { FormField } from '@/design-system/components/FormField';
import { AnnouncementNotice } from '@/shared/announcements/AnnouncementsBanner';
import { notify } from '@/core/notifications/notification-store';
import { notifyError } from '@/core/notifications/error-presentation';
import { usePublishAnnouncement } from './use-announcements';

export interface AnnouncementRecipient {
  id: string;
  name: string;
}
function nextDayInput() {
  const date = new Date(Date.now() + 86400000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export function AnnouncementComposer({
  scope,
  recipients,
  initialTargetId,
  loading,
  onClose,
}: {
  scope: CreateAnnouncementDto['scope'];
  recipients: AnnouncementRecipient[];
  initialTargetId?: string;
  loading: boolean;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const publish = usePublishAnnouncement();
  const [selected, setSelected] = useState<string[]>(initialTargetId ? [initialTargetId] : []);
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<CreateAnnouncementDto['severity']>('info');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState(nextDayInput);
  const [error, setError] = useState('');
  const validSelected = selected.filter((id) =>
    recipients.some((recipient) => recipient.id === id),
  );
  const visible = recipients.filter((recipient) =>
    recipient.name
      .toLocaleLowerCase(i18n.language)
      .includes(search.toLocaleLowerCase(i18n.language)),
  );
  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (publish.isPending) return;
    // Use the instant of the submit event (epoch or DOM high-resolution timestamp).
    const now =
      event.timeStamp >= performance.timeOrigin
        ? event.timeStamp
        : performance.timeOrigin + event.timeStamp;
    const start = startsAt ? Date.parse(startsAt) : now,
      end = Date.parse(endsAt);
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end <= start ||
      end <= now ||
      end - start > 30 * 86400000 ||
      start - now > 90 * 86400000
    ) {
      setError(t('announcements.invalidWindow'));
      return;
    }
    if (!validSelected.length || !title.trim() || !message.trim()) {
      setError(t('announcements.required'));
      return;
    }
    setError('');
    publish.mutate(
      {
        scope,
        targetIds: validSelected,
        title: title.trim(),
        message: message.trim(),
        severity,
        ...(startsAt ? { startsAt: new Date(start).toISOString() } : {}),
        endsAt: new Date(end).toISOString(),
      },
      {
        onSuccess: () => {
          notify({
            tone: 'success',
            title: t('announcements.published'),
            message: t(
              scope === 'installations'
                ? 'announcements.relayHelp'
                : 'announcements.siteDeliveryHelp',
            ),
          });
          onClose();
        },
        onError: notifyError,
      },
    );
  };
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !publish.isPending) onClose();
      }}
      title={t('announcements.new')}
      description={t(
        scope === 'installations'
          ? 'announcements.installationAudience'
          : 'announcements.siteAudience',
      )}
      className="announcement-composer"
      hideDismissAction={publish.isPending}
      actions={
        <Button
          type="submit"
          form="announcement-compose"
          variant="primary"
          icon={<Send />}
          label={t('announcements.publish')}
          pending={publish.isPending}
          disabled={loading || !validSelected.length || !title.trim() || !message.trim() || !endsAt}
        />
      }
    >
      <form
        id="announcement-compose"
        className="form-stack"
        onSubmit={(event) => {
          handleSubmit(event);
        }}
      >
        <fieldset className="announcement-recipients">
          <legend>{t(`announcements.scope.${scope}`)}</legend>
          <input
            type="search"
            aria-label={t('announcements.searchRecipients')}
            placeholder={t('announcements.searchRecipients')}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
          />
          <label className="announcement-recipient-option">
            <input
              type="checkbox"
              checked={recipients.length > 0 && validSelected.length === recipients.length}
              disabled={loading || !recipients.length}
              onChange={(event) => {
                setSelected(event.target.checked ? recipients.map((item) => item.id) : []);
              }}
            />
            <strong>{t('announcements.selectAll')}</strong>
          </label>
          <div className="announcement-recipient-list" aria-busy={loading}>
            {visible.map((recipient) => (
              <label className="announcement-recipient-option" key={recipient.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(recipient.id)}
                  onChange={(event) => {
                    setSelected((previous) =>
                      event.target.checked
                        ? [...previous, recipient.id]
                        : previous.filter((id) => id !== recipient.id),
                    );
                  }}
                />
                <span>{recipient.name}</span>
              </label>
            ))}
            {!loading && !visible.length ? <p>{t('announcements.noRecipients')}</p> : null}
          </div>
          <small>{t('announcements.selected', { count: validSelected.length })}</small>
        </fieldset>
        <FormField label={t('announcements.subject')} required>
          <input
            value={title}
            maxLength={120}
            required
            onChange={(event) => {
              setTitle(event.target.value);
            }}
          />
        </FormField>
        <FormField label={t('announcements.message')} required>
          <textarea
            rows={4}
            value={message}
            maxLength={2000}
            required
            onChange={(event) => {
              setMessage(event.target.value);
            }}
          />
        </FormField>
        <FormField label={t('announcements.importance')}>
          <select
            value={severity}
            onChange={(event) => {
              setSeverity(event.target.value as CreateAnnouncementDto['severity']);
            }}
          >
            {(['info', 'warning', 'critical'] as const).map((value) => (
              <option key={value} value={value}>
                {t(`announcements.severity.${value}`)}
              </option>
            ))}
          </select>
        </FormField>
        <div className="announcement-period">
          <FormField label={t('announcements.startsAt')}>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(event) => {
                setStartsAt(event.target.value);
              }}
            />
          </FormField>
          <FormField label={t('announcements.endsAt')} required>
            <input
              type="datetime-local"
              value={endsAt}
              required
              onChange={(event) => {
                setEndsAt(event.target.value);
              }}
            />
          </FormField>
        </div>
        <small>
          {t('announcements.periodHelp', {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          })}
        </small>
        {scope === 'installations' ? (
          <p className="announcement-delivery-help">{t('announcements.relayHelp')}</p>
        ) : null}
        <div className="announcement-preview">
          <strong>{t('announcements.preview')}</strong>
          <AnnouncementNotice
            announcement={{
              title: title || t('announcements.subject'),
              message: message || t('announcements.previewPlaceholder'),
              severity,
            }}
          />
        </div>
        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
