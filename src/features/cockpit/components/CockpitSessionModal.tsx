import { useTranslation } from 'react-i18next';
import type { CockpitQueueItemDto } from '@/api/generated/models';
import { Button } from '@/design-system/components/Button';
import { FormField } from '@/design-system/components/FormField';
import { Modal } from '@/design-system/components/Modal';

export type CockpitSessionDialogState = { queue: CockpitQueueItemDto } | null;

export function CockpitSessionModal(props: {
  state: CockpitSessionDialogState;
  selectedThread?: number;
  replaceSessionId?: string;
  counterName: string;
  pending: boolean;
  onThreadChange: (
    thread: number,
    replacement?: CockpitQueueItemDto['sessionOpening']['replaceableSessions'][number],
  ) => void;
  onCounterNameChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  const queue = props.state?.queue;
  const options = queue
    ? [
        ...queue.sessionOpening.availableThreadNumbers.map((threadNumber) => ({
          threadNumber,
          available: true as const,
        })),
        ...queue.sessionOpening.replaceableSessions.map((session) => ({
          ...session,
          available: false as const,
        })),
      ]
    : [];
  return (
    <Modal
      open={Boolean(queue)}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
      title={t('cockpit.openSession')}
      description={queue?.queueName}
      actions={
        <Button
          variant="primary"
          pending={props.pending}
          disabled={!props.selectedThread}
          unavailableReason={t('common.completeRequiredFields')}
          onClick={props.onSubmit}
        >
          {t('cockpit.confirmOpenSession')}
        </Button>
      }
    >
      <div className="cockpit-session-form">
        <fieldset>
          <legend>{t('cockpit.chooseCounter')}</legend>
          <div className="cockpit-thread-options">
            {options.map((option) => (
              <label
                key={`${String(option.threadNumber)}-${String(option.available)}`}
                className={
                  props.selectedThread === option.threadNumber &&
                  props.replaceSessionId === (option.available ? undefined : option.sessionId)
                    ? 'is-selected'
                    : ''
                }
              >
                <input
                  type="radio"
                  name="thread"
                  checked={
                    props.selectedThread === option.threadNumber &&
                    props.replaceSessionId === (option.available ? undefined : option.sessionId)
                  }
                  onChange={() => {
                    props.onThreadChange(
                      option.threadNumber,
                      option.available ? undefined : option,
                    );
                  }}
                />
                <span>
                  <strong>{t('cockpit.counterNumber', { number: option.threadNumber })}</strong>
                  <small>
                    {option.available
                      ? t('cockpit.freeCounter')
                      : t('cockpit.occupiedBy', { operator: option.operatorName })}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <FormField label={t('desk.counterName')} hint={t('desk.counterNameHint')}>
          <input
            value={props.counterName}
            maxLength={100}
            placeholder={t('desk.counterNamePlaceholder')}
            onChange={(event) => {
              props.onCounterNameChange(event.target.value);
            }}
          />
        </FormField>
        {props.replaceSessionId ? (
          <p className="field-hint cockpit-replacement-warning">
            {t('cockpit.replacementWarning')}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
