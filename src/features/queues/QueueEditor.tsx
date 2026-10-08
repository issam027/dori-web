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
      description="Les champs laissés sur Hériter utilisent les paramètres du site."
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
          Enregistrer
        </button>
      }
    >
      <div className="form-grid">
        <label>
          Code *
          <input
            maxLength={10}
            value={value.queueCode}
            onChange={(e) => {
              field('queueCode', e.target.value);
            }}
          />
        </label>
        <label>
          Nom
          <input
            value={value.queueName ?? ''}
            onChange={(e) => {
              field('queueName', e.target.value);
            }}
          />
        </label>
        <label>
          Guichets
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
          Attente moyenne
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
          Devise
          <select
            value={value.currency ?? ''}
            onChange={(e) => {
              field('currency', e.target.value || null);
            }}
          >
            <option value="">Hériter du site</option>
            <option>TND</option>
            <option>EUR</option>
            <option>USD</option>
          </select>
        </label>
        <label>
          Locale
          <select
            value={value.locale ?? ''}
            onChange={(e) => {
              field('locale', e.target.value || null);
            }}
          >
            <option value="">Hériter du site</option>
            <option>fr</option>
            <option>ar</option>
            <option>en</option>
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
        {advanced ? 'Masquer' : 'Afficher'} les surcharges avancées
      </button>
      {advanced ? (
        <div className="form-grid admin-advanced-fields">
          <label>
            Rendez-vous
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
              <option value="">Hériter</option>
              <option value="true">Activés</option>
              <option value="false">Désactivés</option>
            </select>
          </label>
          <label>
            Durée du créneau
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
            Capacité
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
            Ouverture
            <input
              type="time"
              value={value.workingHoursStart ?? ''}
              onChange={(e) => {
                field('workingHoursStart', e.target.value || undefined);
              }}
            />
          </label>
          <label>
            Fermeture
            <input
              type="time"
              value={value.workingHoursEnd ?? ''}
              onChange={(e) => {
                field('workingHoursEnd', e.target.value || undefined);
              }}
            />
          </label>
          <label>
            Tolérance retard
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
