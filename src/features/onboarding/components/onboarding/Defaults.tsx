import { useTranslation } from 'react-i18next';
import { type OnboardingDraft } from '../../model/onboarding-draft';
import { WorkingDaysField } from '@/features/queues/public';
import { Title } from './OnboardingStepTitle';
export function Defaults({
  draft,
  update,
}: {
  draft: OnboardingDraft;
  update: (key: keyof OnboardingDraft['site'], value: unknown) => void;
}) {
  const { t: __t } = useTranslation();
  const s = draft.site;
  const n = (key: keyof OnboardingDraft['site'], value: string) => {
    update(key, Number(value));
  };
  return (
    <section>
      <Title
        title={__t('onboarding.onboarding.defaultsOperationnelsDuSite')}
        text={__t('onboarding.defaultsHelp')}
      />
      <div className="form-grid">
        <label>
          {__t('common.devise')}
          <select
            value={s.defaultCurrency}
            onChange={(e) => {
              update('defaultCurrency', e.target.value);
            }}
          >
            <option>{__t('common.tnd')}</option>
            <option>{__t('common.eur')}</option>
            <option>{__t('common.usd')}</option>
          </select>
        </label>
        <label>
          {__t('onboarding.onboarding.dureeCreneau')}
          <input
            type="number"
            min="1"
            value={s.defaultAppointmentSlotDuration}
            onChange={(e) => {
              n('defaultAppointmentSlotDuration', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('common.capacite')}
          <input
            type="number"
            min="1"
            value={s.defaultSlotCapacity}
            onChange={(e) => {
              n('defaultSlotCapacity', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('common.toleranceRetard')}
          <input
            type="number"
            min="0"
            value={s.defaultLateToleranceMinutes}
            onChange={(e) => {
              n('defaultLateToleranceMinutes', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('common.ouverture')}
          <input
            type="time"
            value={s.defaultWorkingHoursStart}
            onChange={(e) => {
              update('defaultWorkingHoursStart', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('common.fermeture')}
          <input
            type="time"
            value={s.defaultWorkingHoursEnd}
            onChange={(e) => {
              update('defaultWorkingHoursEnd', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('onboarding.onboarding.debutInterruption')}
          <input
            type="time"
            value={s.defaultBreakStart}
            onChange={(e) => {
              update('defaultBreakStart', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('onboarding.onboarding.finInterruption')}
          <input
            type="time"
            value={s.defaultBreakEnd}
            onChange={(e) => {
              update('defaultBreakEnd', e.target.value);
            }}
          />
        </label>
        <WorkingDaysField
          value={s.defaultWorkingDays}
          onChange={(days) => {
            update('defaultWorkingDays', days ?? []);
          }}
        />
      </div>
      <label className="check-row">
        <span>
          <b>{__t('onboarding.onboarding.rendezVousActivesParDefaut')}</b>
          <small>{__t('onboarding.onboarding.heriteParLesFiles')}</small>
        </span>
        <input
          type="checkbox"
          checked={s.defaultAppointmentsEnabled}
          onChange={(e) => {
            update('defaultAppointmentsEnabled', e.target.checked);
          }}
        />
      </label>
      <label className="check-row">
        <span>
          <b>{__t('onboarding.onboarding.reporterLAttenteAuLendemain')}</b>
        </span>
        <input
          type="checkbox"
          checked={s.defaultCarryOverWaiting}
          onChange={(e) => {
            update('defaultCarryOverWaiting', e.target.checked);
          }}
        />
      </label>
    </section>
  );
}