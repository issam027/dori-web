import { TierConfigurationCard } from './TierConfigurationCard';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelectedQueueServices, useRefreshQueueServices } from '../hooks/useQueueServices';
import type { QueueResponseDto, ServiceTierResponseDto } from '@/api/generated/models';
import { updateQueueService } from '../api/queue-service-api';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { ErrorState } from '@/design-system/components/FeedbackState';
import { DorifyLoader } from '@/design-system/components/DorifyLoader';

export function QueueServiceSettings({
  queues,
  tiers,
}: {
  queues: QueueResponseDto[];
  tiers: ServiceTierResponseDto[];
}) {
  const { t } = useTranslation();
  const [defaultPending, setDefaultPending] = useState(false);
  const [queueId, setQueueId] = useState(queues[0]?.queueId ?? '');
  const selectedQueue = queues.find((queue) => queue.queueId === queueId) ?? queues[0];
  const queueTierQuery = useSelectedQueueServices(selectedQueue?.queueId);
  const refresh = useRefreshQueueServices();
  const availableTiers = tiers.filter((tier) => tier.isActive);
  if (!queues.length) return <p className="admin-message">{t('settings.queueServices.empty')}</p>;
  return (
    <div className="queue-service-settings">
      <div className="queue-service-toolbar">
        <label>
          <span>{t('queues.singular')}</span>
          <select
            value={selectedQueue?.queueId ?? ''}
            onChange={(event) => { setQueueId(event.target.value); }}
          >
            {queues.map((queue) => (
              <option key={queue.queueId} value={queue.queueId}>
                {queue.queueName} ({queue.queueCode})
              </option>
            ))}
          </select>
        </label>
      </div>
      {queues
        .filter((queue) => queue.queueId === selectedQueue?.queueId)
        .map((queue) => {
          const queueTiers = queueTierQuery.data?.data.items ?? [];
          return (
            <section className="queue-service-group" key={queue.queueId}>
              <header>
                <div>
                  <small>{queue.queueCode}</small>
                  <h3>{queue.queueName}</h3>
                </div>
                <span className="status-badge status-info">
                  {t('settings.queueServices.count', {
                    count: queueTiers.filter((item) => item.isActive).length,
                  })}
                </span>
              </header>
              {queueTierQuery.isPending ? (
                <DorifyLoader compact />
              ) : queueTierQuery.isError ? (
                <ErrorState
                  onRetry={() => {
                    void queueTierQuery.refetch();
                  }}
                />
              ) : (
                <>
                  <label className="queue-default-service">
                    <span>{t('onboarding.defaultService')}</span>
                    <select
                      value={
                        queueTiers.find((item) => item.isActive && item.isDefault)?.tierId ?? ''
                      }
                      disabled={defaultPending || !queueTiers.some((item) => item.isActive)}
                      onChange={(event) => {
                        const tierId = event.target.value;
                        const targetTierId =
                          tierId ||
                          queueTiers.find((item) => item.isActive && item.isDefault)?.tierId;
                        if (!targetTierId) return;
                        setDefaultPending(true);
                        void updateQueueService(queue.queueId, targetTierId, {
                          isDefault: Boolean(tierId),
                        })
                          .then(() => refresh(queue.queueId, tierId))
                          .then(() =>
                            notify({ tone: 'success', title: t('settings.queueServices.saved') }),
                          )
                          .catch(notifyError)
                          .finally(() => { setDefaultPending(false); });
                      }}
                    >
                      <option value="">{t('common.none')}</option>
                      {queueTiers
                        .filter((item) => item.isActive)
                        .map((item) => (
                          <option key={item.tierId} value={item.tierId}>
                            {item.tier?.tierName ??
                              tiers.find((tier) => tier.tierId === item.tierId)?.tierName ??
                              item.tierId}
                          </option>
                        ))}
                    </select>
                    <small>{t('onboarding.defaultServiceHint')}</small>
                  </label>
                  <div className="queue-service-grid">
                    {availableTiers.map((tier, index) => {
                      const association = queueTiers.find((item) => item.tierId === tier.tierId);
                      return (
                        <TierConfigurationCard
                          key={queue.queueId + ':' + tier.tierId}
                          queue={queue}
                          tier={tier}
                          association={association}
                          order={index + 1}
                          refresh={refresh}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          );
        })}
    </div>
  );
}
