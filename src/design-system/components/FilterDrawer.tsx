import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';

export function FilterDrawer({
  activeCount,
  children,
}: {
  activeCount: number;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="button" type="button">
          {t('filters.open')}
          {activeCount > 0 ? <span className="filter-count">{activeCount}</span> : null}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="drawer-content">
          <Dialog.Title>{t('filters.title')}</Dialog.Title>
          {children}
          <Dialog.Close asChild>
            <button className="button" type="button">
              {t('common.cancel')}
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
