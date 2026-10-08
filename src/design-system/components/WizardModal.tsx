import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';

export function WizardModal({
  open,
  onOpenChange,
  title,
  step,
  stepCount,
  children,
  onPrevious,
  onNext,
  canContinue = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  step: number;
  stepCount: number;
  children: ReactNode;
  onPrevious?: () => void;
  onNext: () => void;
  canContinue?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={t('wizard.progress', { step, stepCount })}
      actions={
        <>
          {onPrevious ? (
            <button className="button" type="button" onClick={onPrevious}>
              {t('common.previous')}
            </button>
          ) : (
            <span />
          )}
          <button
            className="button button-primary"
            type="button"
            disabled={!canContinue}
            onClick={onNext}
          >
            {step === stepCount ? t('common.finish') : t('common.next')}
          </button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
