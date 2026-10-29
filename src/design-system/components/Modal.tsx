import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import { Check, CircleAlert, X } from 'lucide-react';
import { Button, ButtonLabelModeProvider } from './Button';
import { DorifyLoader } from './DorifyLoader';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  hideDismissAction?: boolean;
  className?: string;
  loading?: boolean;
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  actions,
  hideDismissAction = false,
  className,
  loading = false,
}: ModalProps) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className={`dialog-content${className ? ` ${className}` : ''}`}>
          <header className="dialog-header">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              {description ? <Dialog.Description>{description}</Dialog.Description> : null}
            </div>
            {!hideDismissAction ? (
              <Dialog.Close asChild>
                <Button
                  className="dialog-header-close"
                  size="icon"
                  icon={<X />}
                  label={t('common.close')}
                  labelMode="icon-only"
                />
              </Dialog.Close>
            ) : null}
          </header>
          <div className="dialog-body">{loading ? <DorifyLoader compact /> : children}</div>
          <ButtonLabelModeProvider value="always">
            <footer className="dialog-actions">
              {!hideDismissAction ? (
                <Dialog.Close asChild>
                  <Button
                    icon={<X />}
                    label={t('common.cancel')}
                    labelMode="responsive"
                    title={t('common.cancel')}
                  />
                </Dialog.Close>
              ) : null}
              {actions}
            </footer>
          </ButtonLabelModeProvider>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = false,
  pending = false,
}: Omit<ModalProps, 'children' | 'actions'> & {
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  pending?: boolean;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      className="confirmation-dialog"
      actions={
        <>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            pending={pending}
            onClick={onConfirm}
          >
            {destructive ? <CircleAlert aria-hidden="true" /> : <Check aria-hidden="true" />}
            {confirmLabel}
          </Button>
        </>
      }
    >
      <span />
    </Modal>
  );
}
