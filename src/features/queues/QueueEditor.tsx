import { useTranslation } from 'react-i18next';
import { useState } from 'react';
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
      description={__t(
        'ui.queues.queue_editor.les_champs_laisses_sur_heriter_utilisent_les_par_fa5g5c',
      )}
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
          {__t('ui.queues.queue_editor.enregistrer_sywgdx')}
        </button>
      }
    >
      <div className="form-grid">
        <label>
          {__t('ui.queues.queue_editor.code_1ej1ao2')}
          <input
            maxLength={10}
            value={value.queueCode}
            onChange={(e) => {
              field('queueCode', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('ui.queues.queue_editor.nom_15eqct1')}
          <input
            value={value.queueName ?? ''}
            onChange={(e) => {
              field('queueName', e.target.value);
            }}
          />
        </label>
        <label>
          {__t('ui.queues.queue_editor.guichets_j0id8z')}
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
          {__t('ui.queues.queue_editor.attente_moyenne_1r05351')}
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
          {__t('ui.queues.queue_editor.devise_1pl1r6r')}
          <select
            value={value.currency ?? ''}
            onChange={(e) => {
              field('currency', e.target.value || null);
            }}
          >
            <option value="">{__t('ui.queues.queue_editor.heriter_du_site_1w0a5wk')}</option>
            <option>{__t('ui.queues.queue_editor.tnd_gge1jd')}</option>
            <option>{__t('ui.queues.queue_editor.eur_1i746uf')}</option>
            <option>{__t('ui.queues.queue_editor.usd_174gkvb')}</option>
          </select>
        </label>
        <label>
          {__t('ui.queues.queue_editor.locale_1pfta5z')}
          <select
            value={value.locale ?? ''}
            onChange={(e) => {
              field('locale', e.target.value || null);
            }}
          >
            <option value="">{__t('ui.queues.queue_editor.heriter_du_site_1w0a5wk')}</option>
            <option>{__t('ui.queues.queue_editor.fr_o6dm29')}</option>
            <option>{__t('ui.queues.queue_editor.ar_puedq2')}</option>
            <option>{__t('ui.queues.queue_editor.en_i2aop6')}</option>
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
        {advanced
          ? __t('ui.expression.queues.queue_editor.masquer_12fkzf1')
          : __t('ui.expression.queues.queue_editor.afficher_pem1r')}{' '}
        {__t('ui.queues.queue_editor.les_surcharges_avancees_yu2ula')}
      </button>
      {advanced ? (
        <div className="form-grid admin-advanced-fields">
          <label>
            {__t('ui.queues.queue_editor.rendez_vous_1jmjhs7')}
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
              <option value="">{__t('ui.queues.queue_editor.heriter_urvbs6')}</option>
              <option value="true">{__t('ui.queues.queue_editor.actives_1ntg7nc')}</option>
              <option value="false">{__t('ui.queues.queue_editor.desactives_1jqymmi')}</option>
            </select>
          </label>
          <label>
            {__t('ui.queues.queue_editor.duree_du_creneau_jith7i')}
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
            {__t('ui.queues.queue_editor.capacite_1nhjc3d')}
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
            {__t('ui.queues.queue_editor.ouverture_pawjjg')}
            <input
              type="time"
              value={value.workingHoursStart ?? ''}
              onChange={(e) => {
                field('workingHoursStart', e.target.value || undefined);
              }}
            />
          </label>
          <label>
            {__t('ui.queues.queue_editor.fermeture_46skya')}
            <input
              type="time"
              value={value.workingHoursEnd ?? ''}
              onChange={(e) => {
                field('workingHoursEnd', e.target.value || undefined);
              }}
            />
          </label>
          <label>
            {__t('ui.queues.queue_editor.tolerance_retard_gttjc8')}
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
