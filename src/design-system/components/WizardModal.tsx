import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Button } from '@/design-system/components/Button';

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
  className,
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
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      className={className}
      description={t('wizard.progress', { step, stepCount })}
      actions={
        <>
          {onPrevious ? (
            <Button variant="unstyled" className="button" type="button" onClick={onPrevious}>
              {t('common.previous')}
            </Button>
          ) : (
            <span />
          )}
          <Button variant="unstyled"
            className="button button-primary"
            type="button"
            disabled={!canContinue}
            onClick={onNext}
          >
            {step === stepCount ? t('common.finish') : t('common.next')}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
