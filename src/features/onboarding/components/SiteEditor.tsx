import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SiteResponseDto, UpdateSiteDto } from '@/api/generated/models';
import { WizardModal } from '@/design-system/components/WizardModal';
import { presentError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { WorkingDaysField } from '@/features/queues/WorkingDaysField';

const time = (value?: string) => value?.slice(0, 5) ?? '';
const optionalTime = (value?: string) => value ? value.slice(0, 5) : undefined;
const integer = (value: number): number => Math.trunc(parseFloat(String(value)));
type SiteNumberKey =
  | 'defaultAppointmentSlotDuration'
  | 'defaultSlotCapacity'
  | 'defaultLateToleranceMinutes';

function sitePayload(value: UpdateSiteDto): UpdateSiteDto {
  return {
    siteName: value.siteName?.trim(),
    siteLocation: value.siteLocation?.trim() || undefined,
    siteLogoUrl: value.siteLogoUrl?.trim() || undefined,
    siteType: value.siteType,
    timezone: value.timezone?.trim(),
    defaultCurrency: value.defaultCurrency?.trim().toUpperCase(),
    defaultAppointmentsEnabled: value.defaultAppointmentsEnabled,
    defaultAppointmentSlotDuration: value.defaultAppointmentSlotDuration,
    defaultSlotCapacity: value.defaultSlotCapacity,
    defaultWorkingHoursStart: optionalTime(value.defaultWorkingHoursStart),
    defaultWorkingHoursEnd: optionalTime(value.defaultWorkingHoursEnd),
    defaultBreakStart: optionalTime(value.defaultBreakStart),
    defaultBreakEnd: optionalTime(value.defaultBreakEnd),
    defaultLateToleranceMinutes: value.defaultLateToleranceMinutes,
    defaultWorkingDays: value.defaultWorkingDays,
    defaultBaseWeightWalkin: value.defaultBaseWeightWalkin,
    defaultBaseWeightAppointment: value.defaultBaseWeightAppointment,
    defaultEscalationRateWalkin: value.defaultEscalationRateWalkin,
    defaultEscalationRateAppointment: value.defaultEscalationRateAppointment,
    defaultCarryOverWaiting: value.defaultCarryOverWaiting,
    defaultDailyResetMode: value.defaultDailyResetMode,
    defaultDailyResetTime: optionalTime(value.defaultDailyResetTime),
    defaultLocale: value.defaultLocale,
  };
}

const initialValue = (site: SiteResponseDto): UpdateSiteDto => ({
  siteName: site.siteName, siteLocation: site.siteLocation ?? '', siteLogoUrl: site.siteLogoUrl ?? '',
  siteType: site.siteType, timezone: site.timezone, defaultCurrency: site.defaultCurrency,
  defaultLocale: site.defaultLocale,
  defaultAppointmentsEnabled: site.defaultAppointmentsEnabled,
  defaultAppointmentSlotDuration: site.defaultAppointmentSlotDuration,
  defaultSlotCapacity: site.defaultSlotCapacity,
  defaultWorkingHoursStart: time(site.defaultWorkingHoursStart),
  defaultWorkingHoursEnd: time(site.defaultWorkingHoursEnd),
  defaultBreakStart: time(site.defaultBreakStart), defaultBreakEnd: time(site.defaultBreakEnd),
  defaultLateToleranceMinutes: site.defaultLateToleranceMinutes,
  defaultWorkingDays: site.defaultWorkingDays,
  defaultBaseWeightWalkin: integer(site.defaultBaseWeightWalkin),
  defaultBaseWeightAppointment: integer(site.defaultBaseWeightAppointment),
  defaultEscalationRateWalkin: integer(site.defaultEscalationRateWalkin),
  defaultEscalationRateAppointment: integer(site.defaultEscalationRateAppointment),
  defaultCarryOverWaiting: site.defaultCarryOverWaiting,
  defaultDailyResetMode: site.defaultDailyResetMode,
  defaultDailyResetTime: time(site.defaultDailyResetTime),
});

export function SiteEditor({ open, site, onOpenChange, onSave }: {
  open: boolean;
  site: SiteResponseDto;
  onOpenChange: (open: boolean) => void;
  onSave: (value: UpdateSiteDto) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [value, setValue] = useState<UpdateSiteDto>(() => initialValue(site));
  const field = <K extends keyof UpdateSiteDto>(key: K, next: UpdateSiteDto[K]) => { setValue((current) => ({ ...current, [key]: next })); };
  const number = (key: SiteNumberKey, raw: string) => { field(key, Number(raw)); };
  const submit = async () => {
    if (step < 3) { setStep((current) => current + 1); return; }
    setSaving(true); setError('');
    try { await onSave(sitePayload(value)); onOpenChange(false); }
    catch (cause) { const message = presentError(cause); setError(message.message); notify({ tone: 'error', ...message }); }
    finally { setSaving(false); }
  };
  const heading = (index: number, title: string, help: string) => <div className="wizard-step-heading"><span>{index}</span><div><h3>{title}</h3><p>{help}</p></div></div>;
  return <WizardModal open={open} onOpenChange={onOpenChange} title={t('siteEditor.title', { defaultValue: 'Modifier le site' })} className="settings-wizard-dialog" step={step} stepCount={3} onPrevious={step > 1 ? () => { setStep((current) => current - 1); } : undefined} onNext={() => void submit()} canContinue={!saving && Boolean(value.siteName?.trim() && value.timezone?.trim() && value.defaultWorkingDays?.length)}>
    <div className="settings-editor-wizard">
      <div className="wizard-progress">{[1, 2, 3].map((item) => <span key={item} className={item <= step ? 'is-complete' : undefined} />)}</div>
      {step === 1 ? <section>{heading(1, t('siteEditor.identity', { defaultValue: 'Identité et localisation' }), t('siteEditor.identityHelp', { defaultValue: 'Informations visibles et paramètres régionaux du site.' }))}<div className="form-grid">
        <label>{t('common.name')}<input maxLength={100} value={value.siteName ?? ''} onChange={(e) => { field('siteName', e.target.value); }} /></label>
        <label>{t('common.localisation')}<input maxLength={255} value={value.siteLocation ?? ''} onChange={(e) => { field('siteLocation', e.target.value); }} /></label>
        <label>{t('siteEditor.logo', { defaultValue: 'URL du logo' })}<input type="url" maxLength={500} value={value.siteLogoUrl ?? ''} onChange={(e) => { field('siteLogoUrl', e.target.value); }} /></label>
        <label>{t('siteEditor.type', { defaultValue: 'Type de site' })}<select value={value.siteType} onChange={(e) => { field('siteType', e.target.value as 'public' | 'private'); }}><option value="public">{t('common.public')}</option><option value="private">{t('common.private')}</option></select></label>
        <label>{t('onboarding.settings.fuseau')}<input value={value.timezone ?? ''} onChange={(e) => { field('timezone', e.target.value); }} /></label>
        <label>{t('common.devise')}<input maxLength={3} value={value.defaultCurrency ?? ''} onChange={(e) => { field('defaultCurrency', e.target.value.toUpperCase()); }} /></label>
        <label>{t('common.locale')}<select value={value.defaultLocale ?? 'fr'} onChange={(e) => { field('defaultLocale', e.target.value); }}><option value="fr">{t('locale.fr')}</option><option value="en">{t('common.english')}</option><option value="ar">{t('locale.ar')}</option></select></label>
      </div></section> : null}
      {step === 2 ? <section>{heading(2, t('siteEditor.schedule', { defaultValue: 'Horaires et rendez-vous' }), t('siteEditor.scheduleHelp', { defaultValue: 'Valeurs appliquées par défaut aux files du site.' }))}<div className="form-grid">
        <label>{t('appointments.title')}<select value={String(value.defaultAppointmentsEnabled ?? false)} onChange={(e) => { field('defaultAppointmentsEnabled', e.target.value === 'true'); }}><option value="true">{t('common.actives')}</option><option value="false">{t('common.desactives')}</option></select></label>
        <label>{t('queues.queueEditor.dureeDuCreneau')}<input type="number" min="1" value={value.defaultAppointmentSlotDuration ?? 1} onChange={(e) => { number('defaultAppointmentSlotDuration', e.target.value); }} /></label>
        <label>{t('common.capacite')}<input type="number" min="1" value={value.defaultSlotCapacity ?? 1} onChange={(e) => { number('defaultSlotCapacity', e.target.value); }} /></label>
        <label>{t('common.toleranceRetard')}<input type="number" min="0" value={value.defaultLateToleranceMinutes ?? 0} onChange={(e) => { number('defaultLateToleranceMinutes', e.target.value); }} /></label>
        <label>{t('common.ouverture')}<input type="time" value={value.defaultWorkingHoursStart ?? ''} onChange={(e) => { field('defaultWorkingHoursStart', e.target.value); }} /></label>
        <label>{t('common.fermeture')}<input type="time" value={value.defaultWorkingHoursEnd ?? ''} onChange={(e) => { field('defaultWorkingHoursEnd', e.target.value); }} /></label>
        <label>{t('siteEditor.breakStart', { defaultValue: 'Début de pause' })}<input type="time" value={value.defaultBreakStart ?? ''} onChange={(e) => { field('defaultBreakStart', e.target.value); }} /></label>
        <label>{t('siteEditor.breakEnd', { defaultValue: 'Fin de pause' })}<input type="time" value={value.defaultBreakEnd ?? ''} onChange={(e) => { field('defaultBreakEnd', e.target.value); }} /></label>
        <WorkingDaysField value={value.defaultWorkingDays} onChange={(days) => { field('defaultWorkingDays', days ?? []); }} />
      </div></section> : null}
      {step === 3 ? <section>{heading(3, t('siteEditor.rules', { defaultValue: 'Priorités et cycle quotidien' }), t('siteEditor.rulesHelp', { defaultValue: 'Règles de priorité, de report et de clôture quotidienne.' }))}<div className="form-grid">
        <label>{t('siteEditor.walkinWeight', { defaultValue: 'Poids sans rendez-vous' })}<input type="number" step="1" value={value.defaultBaseWeightWalkin ?? 0} onChange={(e) => { field('defaultBaseWeightWalkin', e.currentTarget.valueAsNumber); }} /></label>
        <label>{t('siteEditor.appointmentWeight', { defaultValue: 'Poids rendez-vous' })}<input type="number" step="1" value={value.defaultBaseWeightAppointment ?? 0} onChange={(e) => { field('defaultBaseWeightAppointment', e.currentTarget.valueAsNumber); }} /></label>
        <label>{t('siteEditor.walkinEscalation', { defaultValue: 'Escalade sans rendez-vous' })}<input type="number" step="1" value={value.defaultEscalationRateWalkin ?? 0} onChange={(e) => { field('defaultEscalationRateWalkin', e.currentTarget.valueAsNumber); }} /></label>
        <label>{t('siteEditor.appointmentEscalation', { defaultValue: 'Escalade rendez-vous' })}<input type="number" step="1" value={value.defaultEscalationRateAppointment ?? 0} onChange={(e) => { field('defaultEscalationRateAppointment', e.currentTarget.valueAsNumber); }} /></label>
        <label>{t('siteEditor.resetMode', { defaultValue: 'Mode de clôture quotidienne' })}<select value={value.defaultDailyResetMode} onChange={(e) => { field('defaultDailyResetMode', e.target.value as 'close_all' | 'close_served_only'); }}><option value="close_all">{t('common.closeAll')}</option><option value="close_served_only">{t('common.closeServedOnly')}</option></select></label>
        <label>{t('siteEditor.resetTime', { defaultValue: 'Heure de clôture' })}<input type="time" value={value.defaultDailyResetTime ?? ''} onChange={(e) => { field('defaultDailyResetTime', e.target.value); }} /></label>
        <label>{t('siteEditor.carryOver', { defaultValue: 'Reporter les personnes en attente au lendemain' })}<select value={String(value.defaultCarryOverWaiting ?? false)} onChange={(e) => { field('defaultCarryOverWaiting', e.target.value === 'true'); }}><option value="true">{t('common.active')}</option><option value="false">{t('common.inactive')}</option></select></label>
      </div></section> : null}
      {error ? <p className="field-error" role="alert">{error}</p> : null}
    </div>
  </WizardModal>;
}
