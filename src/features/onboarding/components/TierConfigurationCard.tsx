import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueueServiceRules } from '../hooks/useQueueServices';
import { ChevronDown, Power, PowerOff, Save, SlidersHorizontal, Star } from 'lucide-react';
import type {
  NotificationRuleResponseDto,
  QueueResponseDto,
  QueueTierResponseDto,
  ServiceTierResponseDto,
} from '@/api/generated/models';
import {
  enableQueueService,
  createQueueServiceRule,
  deleteQueueServiceRule,
  disableQueueService,
  updateQueueService,
  updateQueueServiceRule,
} from '../api/queue-service-api';
import { serviceTierVisualClass } from '@/design-system/service-tier';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { Button } from '@/design-system/components/Button';
import { ErrorState } from '@/design-system/components/FeedbackState';
import { DorifyLoader } from '@/design-system/components/DorifyLoader';
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

export function TierConfigurationCard({
  queue,
  tier,
  association,
  order,
  refresh,
}: {
  queue: QueueResponseDto;
  tier: ServiceTierResponseDto;
  association?: QueueTierResponseDto;
  order: number;
  refresh: (queueId: string, tierId: string) => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const rulesQuery = useQueueServiceRules(
    queue.queueId,
    tier.tierId,
    expanded && Boolean(association?.isActive),
  );
  const rules = useMemo(() => rulesQuery.data?.data.items ?? [], [rulesQuery.data]);
  const welcomeSmsRule = ruleFor(rules, 'welcomeSms');
  const welcomeEmailRule = ruleFor(rules, 'welcomeEmail');
  const thresholdRule = ruleFor(rules, 'thresholdSms');
  const serverValues = {
    price: association?.price ?? 0,
    currency: association?.currencyOverride ?? '',
    welcomeSms: Boolean(welcomeSmsRule),
    welcomeEmail: Boolean(welcomeEmailRule),
    alertSms: Boolean(thresholdRule),
    alertThresholdType: thresholdRule?.thresholdType ?? 'position',
    alertPosition: thresholdRule?.thresholdValue ?? 3,
    tracking: rules.some((rule) => rule.isActive && rule.includeTrackingLink),
  };
  type Draft = typeof serverValues;
  const [draft, setDraft] = useState<Draft | null>(null);
  const {
    price,
    currency,
    welcomeSms,
    welcomeEmail,
    alertSms,
    alertThresholdType,
    alertPosition,
    tracking,
  } = draft ?? serverValues;
  const update = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...serverValues, ...current, ...patch }));
  };
  const setPrice = (price: number) => {
    update({ price });
  };
  const setCurrency = (currency: string) => {
    update({ currency });
  };
  const setWelcomeSms = (welcomeSms: boolean) => {
    update({ welcomeSms });
  };
  const setWelcomeEmail = (welcomeEmail: boolean) => {
    update({ welcomeEmail });
  };
  const setAlertSms = (alertSms: boolean) => {
    update({ alertSms });
  };
  const setAlertThresholdType = (alertThresholdType: Draft['alertThresholdType']) => {
    update({ alertThresholdType });
  };
  const setAlertPosition = (alertPosition: number) => {
    update({ alertPosition });
  };
  const setTracking = (tracking: boolean) => {
    update({ tracking });
  };
  const [pending, setPending] = useState(false);
  const execute = async (action: () => Promise<unknown>, title: string, resetDraft = false) => {
    setPending(true);
    try {
      await action();
      await refresh(queue.queueId, tier.tierId);
      if (resetDraft) setDraft(null);
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
    dto: Parameters<typeof createQueueServiceRule>[2],
  ) =>
    enabled
      ? existing
        ? updateQueueServiceRule(queue.queueId, tier.tierId, existing.ruleId, {
            ...dto,
            isActive: true,
          })
        : createQueueServiceRule(queue.queueId, tier.tierId, dto)
      : existing
        ? deleteQueueServiceRule(queue.queueId, tier.tierId, existing.ruleId)
        : Promise.resolve();
  const save = () =>
    execute(
      async () => {
        await updateQueueService(queue.queueId, tier.tierId, {
          price,
          currency: currency || null,
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
      },
      t('settings.queueServices.saved'),
      true,
    );
  const notificationsEnabled = welcomeSms || welcomeEmail || alertSms;
  return (
    <article className={`tier-config-card ${association?.isActive ? 'is-selected' : ''}`}>
      <header className="tier-service-header">
        <span
          className={`service-tier-label ${serviceTierVisualClass(tier.tierId, tier.tierCode || tier.tierName)}`}
        >
          <strong>{tier.tierName}</strong>
          <small>{tier.description || tier.tierCode}</small>
          {association?.isActive ? (
            <small className="tier-service-meta">
              {new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format(
                association.price,
              )}{' '}
              {association.currencyOverride || queue.currency}
              {association.isDefault ? <span>{t('onboarding.defaultService')}</span> : null}
            </small>
          ) : null}
        </span>
        <Button
          variant="unstyled"
          type="button"
          className="tier-choice tier-choice-toggle"
          aria-label={
            (association?.isActive ? t('onboarding.settings.desactiver') : t('common.activate')) +
            ' ' +
            tier.tierName
          }
          disabled={pending || Boolean(association?.isActive && tier.isSystem)}
          unavailableReason={
            association?.isActive && tier.isSystem ? t('apiErrors.TIER_IS_SYSTEM') : undefined
          }
          onClick={() =>
            void execute(
              () =>
                association?.isActive
                  ? disableQueueService(queue.queueId, tier.tierId)
                  : enableQueueService(queue.queueId, {
                      tierId: tier.tierId,
                      price: 0,
                      currency: null,
                      displayOrder: order,
                      isDefault: false,
                    }),
              association?.isActive
                ? t('settings.queueServices.disabled')
                : t('onboarding.serviceEnabled'),
            )
          }
        >
          {association?.isActive ? (
            <>
              <PowerOff aria-hidden="true" /> {t('onboarding.settings.desactiver')}
            </>
          ) : (
            <>
              <Power aria-hidden="true" /> {t('common.activate')}
            </>
          )}
        </Button>
      </header>
      {association?.isActive && !association.isDefault ? (
        <div className="tier-default-action">
          <Button
            icon={<Star />}
            label={t('onboarding.makeDefaultService')}
            labelMode="always"
            aria-label={t('onboarding.makeDefaultServiceNamed', { name: tier.tierName })}
            pending={pending}
            onClick={() => {
              void execute(
                () =>
                  updateQueueService(queue.queueId, tier.tierId, {
                    isDefault: true,
                  }),
                t('settings.queueServices.saved'),
              );
            }}
          />
        </div>
      ) : null}
      {association?.isActive ? (
        <details
          className="tier-settings-disclosure"
          onToggle={(event) => {
            setExpanded(event.currentTarget.open);
          }}
        >
          <summary aria-label={t('common.edit') + ' ' + tier.tierName}>
            <SlidersHorizontal aria-hidden="true" /> {t('common.edit')}{' '}
            <ChevronDown aria-hidden="true" />
          </summary>
          {expanded && rulesQuery.isPending ? <DorifyLoader compact /> : null}
          {rulesQuery.isError ? (
            <ErrorState
              onRetry={() => {
                void rulesQuery.refetch();
              }}
            />
          ) : null}
          <div className="tier-inline-config" hidden={!rulesQuery.isSuccess}>
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
            <Button
              variant="unstyled"
              className="button button-primary"
              type="button"
              disabled={pending}
              onClick={() => void save()}
            >
              <Save /> {t('common.save')}
            </Button>
          </div>
        </details>
      ) : (
        <div className="tier-disabled-hint">
          <SlidersHorizontal />
          <span>{t('settings.queueServices.enable')}</span>
        </div>
      )}
    </article>
  );
}
