import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CreateQueueDto, QueueResponseDto } from '@/api/generated/models';
import { WizardModal } from '@/design-system/components/WizardModal';
import { presentError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { WorkingDaysField } from './WorkingDaysField';

const defaults: CreateQueueDto = { queueCode: '', queueName: '', averageWaitTime: 10, threadCount: 1, currency: null, locale: null };
const time = (value?: string) => value ? value.slice(0, 5) : undefined;
type QueueEditorValue = CreateQueueDto;
type RequiredNumberKey = 'threadCount' | 'averageWaitTime';
type OptionalNumberKey =
  | 'appointmentSlotDuration'
  | 'slotCapacity'
  | 'lateToleranceMinutes'
  | 'baseWeightWalkin'
  | 'baseWeightAppointment'
  | 'escalationRateWalkin'
  | 'escalationRateAppointment';
const payload = (value: QueueEditorValue): CreateQueueDto => ({
  queueCode: value.queueCode.trim().toUpperCase(), queueName: value.queueName?.trim(),
  averageWaitTime: value.averageWaitTime, threadCount: value.threadCount,
  currency: value.currency, locale: value.locale,
  appointmentsEnabled: value.appointmentsEnabled,
  appointmentSlotDuration: value.appointmentSlotDuration, slotCapacity: value.slotCapacity,
  workingHoursStart: time(value.workingHoursStart), workingHoursEnd: time(value.workingHoursEnd),
  breakStart: time(value.breakStart), breakEnd: time(value.breakEnd),
  lateToleranceMinutes: value.lateToleranceMinutes,
  workingDays: value.workingDays,
  baseWeightWalkin: value.baseWeightWalkin, baseWeightAppointment: value.baseWeightAppointment,
  escalationRateWalkin: value.escalationRateWalkin,
  escalationRateAppointment: value.escalationRateAppointment,
  carryOverWaiting: value.carryOverWaiting, dailyResetMode: value.dailyResetMode,
  dailyResetTime: time(value.dailyResetTime),
});
const initialValue = (initial?: QueueResponseDto | CreateQueueDto): QueueEditorValue => {
  const source = { ...defaults, ...initial };
  return { ...source, workingDays: initial && 'configOrigins' in initial && initial.configOrigins.workingDays === 'inherited' ? null : source.workingDays, workingHoursStart: time(source.workingHoursStart), workingHoursEnd: time(source.workingHoursEnd), breakStart: time(source.breakStart), breakEnd: time(source.breakEnd), dailyResetTime: time(source.dailyResetTime) };
};

export function QueueEditor({ open, onOpenChange, initial, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; initial?: QueueResponseDto | CreateQueueDto; onSave: (value: QueueEditorValue) => Promise<void> | void; }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [value, setValue] = useState<QueueEditorValue>(() => initialValue(initial));
  const field = <K extends keyof QueueEditorValue>(key: K, next: QueueEditorValue[K]) => { setValue((current) => ({ ...current, [key]: next })); };
  const number = (key: RequiredNumberKey, raw: string) => { field(key, Number(raw)); };
  const optionalNumber = (key: OptionalNumberKey, raw: string) => { field(key, raw === '' ? undefined : Number(raw)); };
  const submit = async () => {
    if (step < 3) { setStep((current) => current + 1); return; }
    setSaving(true); setError('');
    try { await onSave(payload(value)); onOpenChange(false); }
    catch (cause) { const message = presentError(cause); setError(message.message); notify({ tone: 'error', ...message }); }
    finally { setSaving(false); }
  };
  const heading = (index: number, title: string, help: string) => <div className="wizard-step-heading"><span>{index}</span><div><h3>{title}</h3><p>{help}</p></div></div>;
  return <WizardModal open={open} onOpenChange={onOpenChange} title={initial ? t('onboarding.editQueue') : t('onboarding.settings.nouvelleFile')} className="settings-wizard-dialog" step={step} stepCount={3} onPrevious={step > 1 ? () => { setStep((current) => current - 1); } : undefined} onNext={() => void submit()} canContinue={!saving && Boolean(value.queueCode.trim() && value.queueName?.trim()) && (value.workingDays == null || value.workingDays.length > 0)}>
    <div className="settings-editor-wizard">
      <div className="wizard-progress">{[1, 2, 3].map((item) => <span key={item} className={item <= step ? 'is-complete' : undefined} />)}</div>
      {step === 1 ? <section>{heading(1, t('queueEditor.identity', { defaultValue: 'Identité et capacité' }), t('queueEditor.identityHelp', { defaultValue: 'Informations principales et capacité opérationnelle de la file.' }))}<div className="form-grid">
        <label>{t('queues.queueEditor.code')}<input maxLength={10} value={value.queueCode} onChange={(e) => { field('queueCode', e.target.value); }} /></label>
        <label>{t('common.name')}<input maxLength={50} value={value.queueName ?? ''} onChange={(e) => { field('queueName', e.target.value); }} /></label>
        <label>{t('common.guichets')}<input type="number" min="1" value={value.threadCount ?? 1} onChange={(e) => { number('threadCount', e.target.value); }} /></label>
        <label>{t('queues.queueEditor.attenteMoyenne')}<input type="number" min="1" value={value.averageWaitTime ?? 1} onChange={(e) => { number('averageWaitTime', e.target.value); }} /></label>
        <label>{t('common.devise')}<select value={value.currency ?? ''} onChange={(e) => { field('currency', e.target.value || null); }}><option value="">{t('queues.queueEditor.heriterDuSite')}</option><option value="TND">{t('common.tnd')}</option><option value="EUR">{t('common.eur')}</option><option value="USD">{t('common.usd')}</option></select></label>
        <label>{t('common.locale')}<select value={value.locale ?? ''} onChange={(e) => { field('locale', e.target.value || null); }}><option value="">{t('queues.queueEditor.heriterDuSite')}</option><option value="fr">{t('locale.fr')}</option><option value="en">{t('common.english')}</option><option value="ar">{t('locale.ar')}</option></select></label>
      </div></section> : null}
      {step === 2 ? <section>{heading(2, t('queueEditor.schedule', { defaultValue: 'Rendez-vous et horaires' }), t('queues.queueEditor.lesChampsLaissesSurHeriterUtilisentLesPar'))}<div className="form-grid">
        <label>{t('appointments.title')}<select value={value.appointmentsEnabled === undefined ? '' : String(value.appointmentsEnabled)} onChange={(e) => { field('appointmentsEnabled', e.target.value === '' ? undefined : e.target.value === 'true'); }}><option value="">{t('queues.queueEditor.heriter')}</option><option value="true">{t('common.actives')}</option><option value="false">{t('common.desactives')}</option></select></label>
        <label>{t('queues.queueEditor.dureeDuCreneau')}<input type="number" min="1" value={value.appointmentSlotDuration ?? ''} onChange={(e) => { optionalNumber('appointmentSlotDuration', e.target.value); }} /></label>
        <label>{t('common.capacite')}<input type="number" min="1" value={value.slotCapacity ?? ''} onChange={(e) => { optionalNumber('slotCapacity', e.target.value); }} /></label>
        <label>{t('common.toleranceRetard')}<input type="number" min="0" value={value.lateToleranceMinutes ?? ''} onChange={(e) => { optionalNumber('lateToleranceMinutes', e.target.value); }} /></label>
        <label>{t('common.ouverture')}<input type="time" value={value.workingHoursStart ?? ''} onChange={(e) => { field('workingHoursStart', e.target.value || undefined); }} /></label>
        <label>{t('common.fermeture')}<input type="time" value={value.workingHoursEnd ?? ''} onChange={(e) => { field('workingHoursEnd', e.target.value || undefined); }} /></label>
        <label>{t('queueEditor.breakStart', { defaultValue: 'Début de pause' })}<input type="time" value={value.breakStart ?? ''} onChange={(e) => { field('breakStart', e.target.value || undefined); }} /></label>
        <label>{t('queueEditor.breakEnd', { defaultValue: 'Fin de pause' })}<input type="time" value={value.breakEnd ?? ''} onChange={(e) => { field('breakEnd', e.target.value || undefined); }} /></label>
        <WorkingDaysField allowInheritance value={value.workingDays} onChange={(days) => { field('workingDays', days); }} />
      </div></section> : null}
      {step === 3 ? <section>{heading(3, t('queueEditor.rules', { defaultValue: 'Priorités et cycle quotidien' }), t('queueEditor.rulesHelp', { defaultValue: 'Surcharges de priorité, report et clôture de cette file.' }))}<div className="form-grid">
        <label>{t('queueEditor.walkinWeight', { defaultValue: 'Poids sans rendez-vous' })}<input type="number" value={value.baseWeightWalkin ?? ''} onChange={(e) => { optionalNumber('baseWeightWalkin', e.target.value); }} /></label>
        <label>{t('queueEditor.appointmentWeight', { defaultValue: 'Poids rendez-vous' })}<input type="number" value={value.baseWeightAppointment ?? ''} onChange={(e) => { optionalNumber('baseWeightAppointment', e.target.value); }} /></label>
        <label>{t('queueEditor.walkinEscalation', { defaultValue: 'Escalade sans rendez-vous' })}<input type="number" step="0.1" value={value.escalationRateWalkin ?? ''} onChange={(e) => { optionalNumber('escalationRateWalkin', e.target.value); }} /></label>
        <label>{t('queueEditor.appointmentEscalation', { defaultValue: 'Escalade rendez-vous' })}<input type="number" step="0.1" value={value.escalationRateAppointment ?? ''} onChange={(e) => { optionalNumber('escalationRateAppointment', e.target.value); }} /></label>
        <label>{t('queueEditor.resetMode', { defaultValue: 'Mode de clôture quotidienne' })}<select value={value.dailyResetMode ?? ''} onChange={(e) => { field('dailyResetMode', (e.target.value || undefined) as 'close_all' | 'close_served_only' | undefined); }}><option value="">{t('queues.queueEditor.heriter')}</option><option value="close_all">{t('common.closeAll')}</option><option value="close_served_only">{t('common.closeServedOnly')}</option></select></label>
        <label>{t('queueEditor.resetTime', { defaultValue: 'Heure de clôture' })}<input type="time" value={value.dailyResetTime ?? ''} onChange={(e) => { field('dailyResetTime', e.target.value || undefined); }} /></label>
        <label>{t('queueEditor.carryOver', { defaultValue: 'Report des personnes en attente' })}<select value={value.carryOverWaiting === undefined ? '' : String(value.carryOverWaiting)} onChange={(e) => { field('carryOverWaiting', e.target.value === '' ? undefined : e.target.value === 'true'); }}><option value="">{t('queues.queueEditor.heriter')}</option><option value="true">{t('common.enabled')}</option><option value="false">{t('common.disabled')}</option></select></label>
      </div></section> : null}
      {error ? <p className="field-error" role="alert">{error}</p> : null}
    </div>
  </WizardModal>;
}
