import { useTranslation } from 'react-i18next';
import { type OnboardingDraft } from '../../model/onboarding-draft';
import { Button } from '@/design-system/components/Button';
import { Title } from './OnboardingStepTitle';
export function ReviewStep({
  draft,
  save,
}: {
  draft: OnboardingDraft;
  save: (value: OnboardingDraft) => void;
}) {
  const { t: __t } = useTranslation();
  const checks = [
    ['onboarding.review.siteAndDefaults', Boolean(draft.confirmedSiteId)],
    ['onboarding.review.queuesAndCounters', Object.keys(draft.confirmedQueueIds).length > 0],
    ['onboarding.review.tiersAssociated', draft.associatedTierQueueIds.length > 0],
  ] as const;
  return (
    <section>
      <Title
        title={__t('onboarding.onboarding.recetteActivation')}
        text={__t('onboarding.validationHelp')}
      />
      {checks.map(([label, done]) => (
        <div className="check-row" key={label}>
          <b>{__t(label)}</b>
          <span className={`status-badge ${done ? 'status-success' : 'status-warning'}`}>
            {done ? __t('common.valide') : __t('onboarding.onboarding.aFaire')}
          </span>
        </div>
      ))}
      <div className="check-row">
        <div>
          <b>{__t('onboarding.onboarding.testDAppelComplet')}</b>
          <p>{__t('onboarding.onboarding.occuperUnGuichetAppelerPuisServir')}</p>
        </div>
        {draft.testValidated ? (
          <span className="status-badge status-success">{__t('common.valide')}</span>
        ) : (
          <Button
            variant="unstyled"
            type="submit"
            className="button"
            onClick={() => {
              save({ ...draft, testValidated: true });
            }}
          >
            {__t('onboarding.onboarding.lancerLeTest')}
          </Button>
        )}
      </div>
    </section>
  );
}