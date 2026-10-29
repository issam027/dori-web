import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TranslationMobileCard } from './TranslationMobileCard';

it('renders long translated content and delegates mobile actions', async () => {
  const user = userEvent.setup();
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  render(
    <div role="list">
      <TranslationMobileCard
        translation={{
          translationId: '00000000-0000-4000-8000-000000000001',
          translationKey: 'queue-operations.mobile.veryLongTranslationKey',
          category: 'ihm',
          locale: 'ar',
          content: 'محتوى مترجم طويل للاختبار',
          isActive: true,
          createdAt: '2026-10-21T08:00:00.000Z',
          updatedAt: '2026-10-21T08:00:00.000Z',
        }}
        categoryLabel="Interface"
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>,
  );

  expect(screen.getByRole('listitem')).toHaveTextContent('veryLongTranslationKey');
  expect(screen.getByText('محتوى مترجم طويل للاختبار')).toHaveAttribute('dir', 'auto');
  await user.click(screen.getByRole('button', { name: /modifier/i }));
  await user.click(screen.getByRole('button', { name: /actions/i }));
  await user.click(screen.getByRole('menuitem', { name: /supprimer/i }));
  expect(onEdit).toHaveBeenCalledOnce();
  expect(onDelete).toHaveBeenCalledOnce();
});
