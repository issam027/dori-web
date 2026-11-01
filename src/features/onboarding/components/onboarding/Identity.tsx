import { useTranslation } from 'react-i18next';
import { type OnboardingDraft } from '../../model/onboarding-draft';
import { Title } from './OnboardingStepTitle';
export function Identity({
  draft,
  update,
}: {
  draft: OnboardingDraft;
  update: (key: keyof OnboardingDraft['site'], value: unknown) => void;
}) {
  const { t: __t } = useTranslation();
  const s = draft.site;
  return (
    <section>
      <Title
        title={__t('onboarding.onboarding.identiteDuSite')}
        text={__t('onboarding.siteIdentityHelp')}
      />
      <div className="form-grid">
        <label>
          {__t('onboarding.onboarding.nomDuSite')}
          <input
            required
            maxLength={100}
            disabled={Boolean(draft.confirmedSiteId)}
            value={s.siteName}
            onChange={(e) => {
              update('siteName', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('common.type')}
          <select
            value={s.siteType}
            onChange={(e) => {
              update('siteType', e.target.value);
            }}
          >
            <option value="public">{__t('onboarding.onboarding.public')}</option>
            <option value="private">{__t('onboarding.onboarding.prive')}</option>
          </select>
        </label>
        <label>
          {__t('common.localisation')}
          <input
            maxLength={255}
            value={s.siteLocation ?? ''}
            onChange={(e) => {
              update('siteLocation', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('onboarding.onboarding.urlDuLogo')}
          <input
            type="url"
            value={s.siteLogoUrl ?? ''}
            onChange={(e) => {
              update('siteLogoUrl', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('onboarding.onboarding.fuseauIana')}
          <select
            value={s.timezone}
            onChange={(e) => {
              update('timezone', e.target.value);
            }}
          >
            <option>{__t('onboarding.onboarding.africaTunis')}</option>
            <option>{__t('common.europeParis')}</option>
            <option>{__t('onboarding.onboarding.africaCasablanca')}</option>
          </select>
        </label>
        <label>
          {__t('common.locale')}
          <select
            value={s.defaultLocale}
            onChange={(e) => {
              update('defaultLocale', e.target.value);
            }}
          >
            <option>{__t('common.fr')}</option>
            <option>{__t('common.ar')}</option>
            <option>{__t('common.en')}</option>
          </select>
        </label>
      </div>
    </section>
  );
}