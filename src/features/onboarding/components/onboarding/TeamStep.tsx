import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Title } from './OnboardingStepTitle';
export function TeamStep() {
  const { t: __t } = useTranslation();
  return (
    <section>
      <Title
        title={__t('onboarding.onboarding.equipeAppareils')}
        text={__t('onboarding.accountsHelp')}
      />
      <div className="empty-admin-state">
        <span className="ticket-chip">5</span>
        <h3>{__t('onboarding.onboarding.assistantDeComptesPartage')}</h3>
        <p>{__t('onboarding.onboarding.creezLeRoleInitialPuisAffectezLesSitesEt')}</p>
        <Link className="button button-primary" to="/admin/users">
          {__t('onboarding.onboarding.ouvrirLesUtilisateurs')}
        </Link>
      </div>
    </section>
  );
}