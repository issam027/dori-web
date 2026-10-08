import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}

export function Modal({ open, onOpenChange, title, description, children, actions }: ModalProps) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <header className="dialog-header">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              {description ? <Dialog.Description>{description}</Dialog.Description> : null}
            </div>
          </header>
          <div className="dialog-body">{children}</div>
          <footer className="dialog-actions">
            <Dialog.Close asChild>
              <button className="button" type="button">
                {t('common.cancel')}
              </button>
            </Dialog.Close>
            {actions}
          </footer>
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
}: Omit<ModalProps, 'children' | 'actions'> & {
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      actions={
        <>
          <button
            className={`button ${destructive ? 'button-danger' : 'button-primary'}`}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <span />
    </Modal>
  );
}
