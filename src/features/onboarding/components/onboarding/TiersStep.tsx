import { useTranslation } from 'react-i18next';
import { serviceTierVisualClass } from '@/design-system/service-tier';
import { type OnboardingDraft, type OnboardingTierConfiguration } from '../../model/onboarding-draft';
import { Button } from '@/design-system/components/Button';
import { Title } from './OnboardingStepTitle';
export function TiersStep({
  fixed,
  loading,
  draft,
  save,
}: {
  fixed: { tierId: string; tierCode: string; tierName: string; description?: string }[];
  loading: boolean;
  draft: OnboardingDraft;
  save: (value: OnboardingDraft) => void;
}) {
  const { t: __t } = useTranslation();
  const queues = Object.entries(draft.confirmedQueueIds);
  const defaultConfiguration = (
    displayOrder: number,
    isDefault: boolean,
  ): OnboardingTierConfiguration => ({
    price: 0,
    currency: '',
    isDefault,
    displayOrder,
    welcomeSms: false,
    welcomeEmail: false,
    alertSms: false,
    alertThresholdType: 'position',
    alertPosition: 3,
    includeTrackingLink: true,
  });
  const toggle = (queueId: string, tierId: string) => {
    const key = queueId;
    const tierKey = tierId;
    const selected = draft.selectedTierIds[key] ?? [];
    const removing = selected.includes(tierId);
    const nextSelected = removing
      ? selected.filter((current) => current !== tierId)
      : [...selected, tierId];
    const currentConfigurations = Object.fromEntries(
      Object.entries(draft.tierConfigurations[key] ?? {}).filter(
        ([configurationKey]) => !removing || configurationKey !== tierKey,
      ),
    );
    if (!removing)
      currentConfigurations[tierKey] = defaultConfiguration(nextSelected.length, false);

    const nextConfigurations = Object.fromEntries(
      nextSelected.map((current, index) => {
        const currentKey = current;
        const configuration =
          currentConfigurations[currentKey] ?? defaultConfiguration(index + 1, false);
        return [
          currentKey,
          {
            ...configuration,
            displayOrder: index + 1,
            isDefault: configuration.isDefault,
          },
        ];
      }),
    );
    save({
      ...draft,
      selectedTierIds: { ...draft.selectedTierIds, [key]: nextSelected },
      tierConfigurations: { ...draft.tierConfigurations, [key]: nextConfigurations },
    });
  };
  const configure = (
    queueId: string,
    tierId: string,
    patch: Partial<OnboardingDraft['tierConfigurations'][string][string]>,
  ) => {
    const queueKey = queueId;
    const tierKey = tierId;
    const selected = draft.selectedTierIds[queueKey] ?? [];
    const currentConfigurations = { ...(draft.tierConfigurations[queueKey] ?? {}) };
    const current =
      currentConfigurations[tierKey] ?? defaultConfiguration(selected.indexOf(tierId) + 1, false);
    if (patch.isDefault || !tierId) {
      selected.forEach((selectedTierId) => {
        const selectedKey = selectedTierId;
        const configuration =
          currentConfigurations[selectedKey] ??
          defaultConfiguration(selected.indexOf(selectedTierId) + 1, false);
        currentConfigurations[selectedKey] = { ...configuration, isDefault: false };
      });
    }
    if (tierId) currentConfigurations[tierKey] = { ...current, ...patch };
    save({
      ...draft,
      tierConfigurations: {
        ...draft.tierConfigurations,
        [queueKey]: currentConfigurations,
      },
    });
  };
  return (
    <section>
      <Title title={__t('common.niveauxDeService')} text={__t('onboarding.tiersHelp')} />
      {loading ? <p>{__t('onboarding.onboarding.chargementDuCatalogue')}</p> : null}
      {fixed.length === 0 && !loading ? (
        <p className="admin-message" role="alert">
          {__t('onboarding.onboarding.aucunNiveauGratuitStandardOuPremiumActifN')}
        </p>
      ) : null}
      {queues.map(([queueCode, queueId]) => {
        const queueKey = queueId;
        const selected = draft.selectedTierIds[queueKey] ?? [];
        return (
          <div className="tier-queue-section" key={queueId}>
            <div className="card-heading">
              <div>
                <h3>{queueCode}</h3>
                <p>{__t('onboarding.selectedServices', { count: selected.length })}</p>
              </div>
              <span
                className={`status-badge ${selected.length ? 'status-success' : 'status-warning'}`}
              >
                {selected.length
                  ? __t('onboarding.onboarding.configurationPrete')
                  : __t('onboarding.onboarding.selectionRequise')}
              </span>
            </div>
            {selected.length ? (
              <label className="queue-default-service">
                <span>{__t('onboarding.defaultService')}</span>
                <select
                  value={
                    selected.find((id) => draft.tierConfigurations[queueKey]?.[id]?.isDefault) ?? ''
                  }
                  onChange={(event) => { configure(queueId, event.target.value, { isDefault: true }); }}
                >
                  <option value="">{__t('common.none')}</option>
                  {fixed
                    .filter((tier) => selected.includes(tier.tierId))
                    .map((tier) => (
                      <option key={tier.tierId} value={tier.tierId}>
                        {tier.tierName}
                      </option>
                    ))}
                </select>
              </label>
            ) : null}
            <div className="tier-card-grid">
              {fixed.map((tier) => {
                const isSelected = selected.includes(tier.tierId);
                const configuration =
                  draft.tierConfigurations[queueKey]?.[tier.tierId] ??
                  defaultConfiguration(selected.indexOf(tier.tierId) + 1, false);
                const notificationsEnabled =
                  configuration.welcomeSms || configuration.welcomeEmail || configuration.alertSms;
                return (
                  <article
                    className={`station tier-config-card ${isSelected ? 'selected' : ''}`}
                    key={tier.tierId}
                  >
                    <Button
                      variant="unstyled"
                      type="button"
                      className="tier-choice tier-choice-toggle"
                      aria-pressed={isSelected}
                      onClick={() => {
                        toggle(queueId, tier.tierId);
                      }}
                    >
                      <span className={`status-badge ${isSelected ? 'status-success' : ''}`}>
                        {isSelected
                          ? __t('onboarding.serviceEnabled')
                          : __t('onboarding.enableService')}
                      </span>
                      <span
                        className={`service-tier-label ${serviceTierVisualClass(tier.tierId, tier.tierCode || tier.tierName)}`}
                      >
                        <strong>{tier.tierName}</strong>
                        <small>{tier.description || tier.tierCode}</small>
                      </span>
                    </Button>
                    {isSelected ? (
                      <div className="tier-inline-config">
                        <div className="tier-config-grid">
                          <label>
                            <span>{__t('onboarding.servicePrice')}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={configuration.price}
                              onChange={(event) => {
                                configure(queueId, tier.tierId, {
                                  price: Math.max(0, Number(event.target.value) || 0),
                                });
                              }}
                            />
                          </label>
                          <label>
                            <span>{__t('onboarding.serviceCurrency')}</span>
                            <select
                              value={configuration.currency}
                              onChange={(event) => {
                                configure(queueId, tier.tierId, { currency: event.target.value });
                              }}
                            >
                              <option value="">{draft.site.defaultCurrency}</option>
                              {[draft.site.defaultCurrency, 'TND', 'EUR', 'USD']
                                .filter(
                                  (currency, index, values) =>
                                    currency && values.indexOf(currency) === index,
                                )
                                .map((currency) => (
                                  <option value={currency} key={currency}>
                                    {currency}
                                  </option>
                                ))}
                            </select>
                          </label>
                        </div>
                        <fieldset className="tier-options-fieldset">
                          <legend>{__t('onboarding.serviceOptions')}</legend>
                          <label>
                            <input
                              type="checkbox"
                              checked={configuration.welcomeSms}
                              onChange={(event) => {
                                configure(queueId, tier.tierId, {
                                  welcomeSms: event.target.checked,
                                });
                              }}
                            />
                            <span>{__t('onboarding.welcomeSms')}</span>
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={configuration.welcomeEmail}
                              onChange={(event) => {
                                configure(queueId, tier.tierId, {
                                  welcomeEmail: event.target.checked,
                                });
                              }}
                            />
                            <span>{__t('onboarding.welcomeEmail')}</span>
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={configuration.alertSms}
                              onChange={(event) => {
                                configure(queueId, tier.tierId, { alertSms: event.target.checked });
                              }}
                            />
                            <span>{__t('onboarding.approachSms')}</span>
                          </label>
                          {configuration.alertSms ? (
                            <div className="tier-threshold-config">
                              <label className="tier-threshold-field">
                                <span>{__t('onboarding.alertThresholdType')}</span>
                                <select
                                  value={configuration.alertThresholdType}
                                  onChange={(event) => {
                                    configure(queueId, tier.tierId, {
                                      alertThresholdType: event.target.value as
                                        'position' | 'estimatedTime',
                                    });
                                  }}
                                >
                                  <option value="position">
                                    {__t('onboarding.thresholdByPosition')}
                                  </option>
                                  <option value="estimatedTime">
                                    {__t('onboarding.thresholdByTime')}
                                  </option>
                                </select>
                              </label>
                              <label className="tier-threshold-field">
                                <span>
                                  {__t(
                                    configuration.alertThresholdType === 'position'
                                      ? 'onboarding.alertPosition'
                                      : 'onboarding.alertMinutes',
                                  )}
                                </span>
                                <input
                                  type="number"
                                  min="1"
                                  max="99"
                                  value={configuration.alertPosition}
                                  onChange={(event) => {
                                    configure(queueId, tier.tierId, {
                                      alertPosition: Math.max(1, Number(event.target.value) || 1),
                                    });
                                  }}
                                />
                              </label>
                            </div>
                          ) : null}
                          <label className={!notificationsEnabled ? 'is-disabled' : ''}>
                            <input
                              type="checkbox"
                              checked={configuration.includeTrackingLink}
                              disabled={!notificationsEnabled}
                              onChange={(event) => {
                                configure(queueId, tier.tierId, {
                                  includeTrackingLink: event.target.checked,
                                });
                              }}
                            />
                            <span>{__t('onboarding.trackingLink')}</span>
                          </label>
                        </fieldset>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}