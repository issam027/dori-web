import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { Check, Save, SlidersHorizontal } from 'lucide-react';
import type {
  NotificationRuleResponseDto,
  QueueResponseDto,
  QueueTierResponseDto,
  ServiceTierResponseDto,
} from '@/api/generated/models';
import {
  serviceTiersControllerAssociateTier,
  serviceTiersControllerCreateRule,
  serviceTiersControllerDeleteRule,
  serviceTiersControllerGetQueueTiers,
  serviceTiersControllerGetRules,
  serviceTiersControllerRemoveQueueTier,
  serviceTiersControllerUpdateQueueTier,
  serviceTiersControllerUpdateRule,
} from '@/api/generated/tiers/tiers';
import { serviceTierVisualClass } from '@/design-system/service-tier';
import { queryKeys } from '@/api/client/query-keys';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';

export function QueueServiceSettings({
  queues,
  tiers,
}: {
  queues: QueueResponseDto[];
  tiers: ServiceTierResponseDto[];
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const queueTierQueries = useQueries({
    queries: queues.map((queue) => ({
      queryKey: queryKeys.tiers.byQueue(queue.queueId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        serviceTiersControllerGetQueueTiers(
          queue.queueId,
          { page: 1, pageSize: 100, sort: 'displayOrder:asc' },
          undefined,
          signal,
        ),
    })),
  });
  const associations = useMemo(
    () => queueTierQueries.flatMap((query) => query.data?.data.items ?? []),
    [queueTierQueries],
  );
  const ruleQueries = useQueries({
    queries: associations.map((item) => ({
      queryKey: queryKeys.tiers.rules(item.queueId, item.tierId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        serviceTiersControllerGetRules(
          item.queueId,
          item.tierId,
          { page: 1, pageSize: 100 },
          undefined,
          signal,
        ),
      enabled: item.isActive,
    })),
  });
  const refresh = async (queueId: number, tierId: number) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.tiers.byQueue(queueId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tiers.rules(queueId, tierId) }),
    ]);
  };
  const availableTiers = tiers.filter((tier) => tier.isActive);
  if (!queues.length) return <p className="admin-message">{t('settings.queueServices.empty')}</p>;
  return (
    <div className="queue-service-settings">
      {queues.map((queue, queueIndex) => {
        const queueTiers = queueTierQueries[queueIndex]?.data?.data.items ?? [];
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
            <div className="queue-service-grid">
              {availableTiers.map((tier, index) => {
                const association = queueTiers.find((item) => item.tierId === tier.tierId);
                const globalIndex = associations.findIndex(
                  (item) => item.queueId === queue.queueId && item.tierId === tier.tierId,
                );
                const rules = ruleQueries[globalIndex]?.data?.data.items ?? [];
                return (
                  <TierConfigurationCard
                    key={JSON.stringify([tier.tierId, association, rules])}
                    queue={queue}
                    tier={tier}
                    association={association}
                    rules={rules}
                    order={index + 1}
                    refresh={refresh}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

type RuleKind = 'welcomeSms' | 'welcomeEmail' | 'thresholdSms';
function ruleFor(rules: NotificationRuleResponseDto[], kind: RuleKind) {
  return rules.find(
    (rule) =>
      rule.isActive &&
      (kind === 'thresholdSms'
        ? rule.notificationType === 'threshold' && rule.channel === 'sms'
        : rule.notificationType === 'welcome' &&
          rule.channel === (kind === 'welcomeSms' ? 'sms' : 'email')),
  );
}

function TierConfigurationCard({
  queue,
  tier,
  association,
  rules,
  order,
  refresh,
}: {
  queue: QueueResponseDto;
  tier: ServiceTierResponseDto;
  association?: QueueTierResponseDto;
  rules: NotificationRuleResponseDto[];
  order: number;
  refresh: (queueId: number, tierId: number) => Promise<void>;
}) {
  const { t } = useTranslation();
  const welcomeSmsRule = ruleFor(rules, 'welcomeSms');
  const welcomeEmailRule = ruleFor(rules, 'welcomeEmail');
  const thresholdRule = ruleFor(rules, 'thresholdSms');
  const [price, setPrice] = useState(association?.price ?? 0);
  const [currency, setCurrency] = useState(association?.currencyOverride ?? '');
  const [isDefault, setDefault] = useState(association?.isDefault ?? false);
  const [welcomeSms, setWelcomeSms] = useState(Boolean(welcomeSmsRule));
  const [welcomeEmail, setWelcomeEmail] = useState(Boolean(welcomeEmailRule));
  const [alertSms, setAlertSms] = useState(Boolean(thresholdRule));
  const [alertThresholdType, setAlertThresholdType] = useState<'position' | 'estimatedTime'>(
    thresholdRule?.thresholdType ?? 'position',
  );
  const [alertPosition, setAlertPosition] = useState(thresholdRule?.thresholdValue ?? 3);
  const [tracking, setTracking] = useState(
    rules.some((rule) => rule.isActive && rule.includeTrackingLink),
  );
  const [pending, setPending] = useState(false);
  const execute = async (action: () => Promise<unknown>, title: string) => {
    setPending(true);
    try {
      await action();
      await refresh(queue.queueId, tier.tierId);
      notify({ tone: 'success', title, message: tier.tierName });
    } catch (error) {
      notifyError(error);
    } finally {
      setPending(false);
    }
  };
  const reconcile = (
    existing: NotificationRuleResponseDto | undefined,
    enabled: boolean,
    dto: Parameters<typeof serviceTiersControllerCreateRule>[2],
  ) =>
    enabled
      ? existing
        ? serviceTiersControllerUpdateRule(queue.queueId, tier.tierId, existing.ruleId, {
            ...dto,
            isActive: true,
          })
        : serviceTiersControllerCreateRule(queue.queueId, tier.tierId, dto)
      : existing
        ? serviceTiersControllerDeleteRule(queue.queueId, tier.tierId, existing.ruleId)
        : Promise.resolve();
  const save = () =>
    execute(async () => {
      await serviceTiersControllerUpdateQueueTier(queue.queueId, tier.tierId, {
        price,
        currency: currency || null,
        isDefault,
      });
      await Promise.all([
        reconcile(welcomeSmsRule, welcomeSms, {
          notificationType: 'welcome',
          channel: 'sms',
          includeTrackingLink: tracking,
        }),
        reconcile(welcomeEmailRule, welcomeEmail, {
          notificationType: 'welcome',
          channel: 'email',
          includeTrackingLink: tracking,
        }),
        reconcile(thresholdRule, alertSms, {
          notificationType: 'threshold',
          channel: 'sms',
          thresholdType: alertThresholdType,
          thresholdValue: alertPosition,
          includeTrackingLink: tracking,
        }),
      ]);
    }, t('settings.queueServices.saved'));
  const notificationsEnabled = welcomeSms || welcomeEmail || alertSms;
  return (
    <article
      className={`station tier-config-card ${association?.isActive ? 'selected is-selected' : ''}`}
    >
      <button
        type="button"
        className="tier-choice tier-choice-toggle"
        aria-pressed={Boolean(association?.isActive)}
        disabled={pending}
        onClick={() =>
          void execute(
            () =>
              association?.isActive
                ? serviceTiersControllerRemoveQueueTier(queue.queueId, tier.tierId)
                : serviceTiersControllerAssociateTier(queue.queueId, {
                    tierId: tier.tierId,
                    price: 0,
                    currency: null,
                    displayOrder: order,
                    isDefault: order === 1,
                  }),
            association?.isActive
              ? t('settings.queueServices.disabled')
              : t('onboarding.serviceEnabled'),
          )
        }
      >
        <span className={`status-badge ${association?.isActive ? 'status-success' : ''}`}>
          {association?.isActive ? (
            <>
              <Check /> {t('onboarding.serviceEnabled')}
            </>
          ) : (
            t('onboarding.enableService')
          )}
        </span>
        <span className={`service-tier-label ${serviceTierVisualClass(tier.tierId, tier.tierCode || tier.tierName)}`}>
          <strong>{tier.tierName}</strong>
          <small>{tier.description || tier.tierCode}</small>
        </span>
      </button>
      {association?.isActive ? (
        <div className="tier-inline-config">
          <div className="tier-config-grid">
            <label>
              <span>{t('onboarding.servicePrice')}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) => {
                  setPrice(Math.max(0, Number(event.target.value) || 0));
                }}
              />
            </label>
            <label>
              <span>{t('onboarding.serviceCurrency')}</span>
              <select
                value={currency}
                onChange={(event) => {
                  setCurrency(event.target.value);
                }}
              >
                <option value="">{queue.currency}</option>
                {[queue.currency, 'TND', 'EUR', 'USD']
                  .filter((value, index, values) => value && values.indexOf(value) === index)
                  .map((value) => (
                    <option key={value}>{value}</option>
                  ))}
              </select>
            </label>
          </div>
          <label className="tier-default-option">
            <input
              type="radio"
              name={`default-tier-${String(queue.queueId)}`}
              checked={isDefault}
              onChange={() => {
                setDefault(true);
              }}
            />
            <span>
              <strong>{t('onboarding.defaultService')}</strong>
            </span>
          </label>
          <fieldset className="tier-options-fieldset">
            <legend>{t('onboarding.serviceOptions')}</legend>
            <label>
              <input
                type="checkbox"
                checked={welcomeSms}
                onChange={(event) => {
                  setWelcomeSms(event.target.checked);
                }}
              />
              <span>{t('onboarding.welcomeSms')}</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={welcomeEmail}
                onChange={(event) => {
                  setWelcomeEmail(event.target.checked);
                }}
              />
              <span>{t('onboarding.welcomeEmail')}</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={alertSms}
                onChange={(event) => {
                  setAlertSms(event.target.checked);
                }}
              />
              <span>{t('onboarding.approachSms')}</span>
            </label>
            {alertSms ? (
              <div className="tier-threshold-config">
                <label className="tier-threshold-field">
                  <span>{t('onboarding.alertThresholdType')}</span>
                  <select
                    value={alertThresholdType}
                    onChange={(event) => {
                      setAlertThresholdType(event.target.value as 'position' | 'estimatedTime');
                    }}
                  >
                    <option value="position">{t('onboarding.thresholdByPosition')}</option>
                    <option value="estimatedTime">{t('onboarding.thresholdByTime')}</option>
                  </select>
                </label>
                <label className="tier-threshold-field">
                  <span>
                    {t(
                      alertThresholdType === 'position'
                        ? 'onboarding.alertPosition'
                        : 'onboarding.alertMinutes',
                    )}
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={alertPosition}
                    onChange={(event) => {
                      setAlertPosition(Math.max(1, Number(event.target.value) || 1));
                    }}
                  />
                </label>
              </div>
            ) : null}
            <label className={!notificationsEnabled ? 'is-disabled' : ''}>
              <input
                type="checkbox"
                checked={tracking}
                disabled={!notificationsEnabled}
                onChange={(event) => {
                  setTracking(event.target.checked);
                }}
              />
              <span>{t('onboarding.trackingLink')}</span>
            </label>
          </fieldset>
          <button
            className="button button-primary"
            type="button"
            disabled={pending}
            onClick={() => void save()}
          >
            <Save /> {t('common.save')}
          </button>
        </div>
      ) : (
        <div className="tier-disabled-hint">
          <SlidersHorizontal />
          <span>{t('settings.queueServices.enable')}</span>
        </div>
      )}
    </article>
  );
}
