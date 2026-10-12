import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Save } from 'lucide-react';
import type { CreateQueueDto, QueueResponseDto } from '@/api/generated/models';
import { Modal } from '@/design-system/components/Modal';

const defaults: CreateQueueDto = {
  queueCode: '',
  queueName: '',
  averageWaitTime: 10,
  threadCount: 1,
  currency: null,
  locale: null,
};

export function QueueEditor({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: QueueResponseDto | CreateQueueDto;
  onSave: (value: CreateQueueDto) => Promise<void> | void;
}) {
  const { t: __t } = useTranslation();
  const [value, setValue] = useState<CreateQueueDto>(() => ({ ...defaults, ...initial }));
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const field = <K extends keyof CreateQueueDto>(key: K, next: CreateQueueDto[K]) => {
    setValue((current) => ({ ...current, [key]: next }));
  };
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? 'Modifier la file' : 'Nouvelle file'}
      description={__t('queues.queueEditor.lesChampsLaissesSurHeriterUtilisentLesPar')}
      actions={
        <button
          className="button button-primary"
          type="button"
          disabled={!value.queueCode.trim() || saving}
          onClick={() => {
            void (async () => {
              setSaving(true);
              try {
                await onSave({ ...value, queueCode: value.queueCode.trim().toUpperCase() });
                onOpenChange(false);
              } finally {
                setSaving(false);
              }
            })();
          }}
        >
          <Save aria-hidden="true" />
          {__t('common.save')}
        </button>
      }
    >
      <div className="form-grid">
        <label>
          {__t('queues.queueEditor.code')}
          <input
            maxLength={10}
            value={value.queueCode}
            onChange={(e) => {
              field('queueCode', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('common.name')}
          <input
            value={value.queueName ?? ''}
            onChange={(e) => {
              field('queueName', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('common.guichets')}
          <input
            type="number"
            min="1"
            value={value.threadCount ?? 1}
            onChange={(e) => {
              field('threadCount', Number(e.target.value));
            }}
          />
        </label>
        <label>
          {__t('queues.queueEditor.attenteMoyenne')}
          <input
            type="number"
            min="0"
            value={value.averageWaitTime ?? 0}
            onChange={(e) => {
              field('averageWaitTime', Number(e.target.value));
            }}
          />
        </label>
        <label>
          {__t('common.devise')}
          <select
            value={value.currency ?? ''}
            onChange={(e) => {
              field('currency', e.target.value || null);
            }}
          >
            <option value="">{__t('queues.queueEditor.heriterDuSite')}</option>
            <option>{__t('common.tnd')}</option>
            <option>{__t('common.eur')}</option>
            <option>{__t('common.usd')}</option>
          </select>
        </label>
        <label>
          {__t('common.locale')}
          <select
            value={value.locale ?? ''}
            onChange={(e) => {
              field('locale', e.target.value || null);
            }}
          >
            <option value="">{__t('queues.queueEditor.heriterDuSite')}</option>
            <option>{__t('common.fr')}</option>
            <option>{__t('common.ar')}</option>
            <option>{__t('common.en')}</option>
          </select>
        </label>
      </div>
      <button
        className="button button-quiet"
        type="button"
        onClick={() => {
          setAdvanced(!advanced);
        }}
      >
        {advanced ? __t('queues.queueEditor.masquer') : __t('queues.queueEditor.afficherPem1r')}{' '}
        {__t('queues.queueEditor.lesSurchargesAvancees')}
      </button>
      {advanced ? (
        <div className="form-grid admin-advanced-fields">
          <label>
            {__t('appointments.title')}
            <select
              value={
                value.appointmentsEnabled === undefined ? '' : String(value.appointmentsEnabled)
              }
              onChange={(e) => {
                field(
                  'appointmentsEnabled',
                  e.target.value === '' ? undefined : e.target.value === 'true',
                );
              }}
            >
              <option value="">{__t('queues.queueEditor.heriter')}</option>
              <option value="true">{__t('common.actives')}</option>
              <option value="false">{__t('common.desactives')}</option>
            </select>
          </label>
          <label>
            {__t('queues.queueEditor.dureeDuCreneau')}
            <input
              type="number"
              min="1"
              value={value.appointmentSlotDuration ?? ''}
              onChange={(e) => {
                field(
                  'appointmentSlotDuration',
                  e.target.value ? Number(e.target.value) : undefined,
                );
              }}
            />
          </label>
          <label>
            {__t('common.capacite')}
            <input
              type="number"
              min="1"
              value={value.slotCapacity ?? ''}
              onChange={(e) => {
                field('slotCapacity', e.target.value ? Number(e.target.value) : undefined);
              }}
            />
          </label>
          <label>
            {__t('common.ouverture')}
            <input
              type="time"
              value={value.workingHoursStart ?? ''}
              onChange={(e) => {
                field('workingHoursStart', e.target.value || undefined);
              }}
            />
          </label>
          <label>
            {__t('common.fermeture')}
            <input
              type="time"
              value={value.workingHoursEnd ?? ''}
              onChange={(e) => {
                field('workingHoursEnd', e.target.value || undefined);
              }}
            />
          </label>
          <label>
            {__t('common.toleranceRetard')}
            <input
              type="number"
              min="0"
              value={value.lateToleranceMinutes ?? ''}
              onChange={(e) => {
                field('lateToleranceMinutes', e.target.value ? Number(e.target.value) : undefined);
              }}
            />
          </label>
        </div>
      ) : null}
    </Modal>
  );
}
