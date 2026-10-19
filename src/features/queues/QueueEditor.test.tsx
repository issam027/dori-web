import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueueEditor } from './QueueEditor';

it('updates the intended text and numeric fields before saving', async () => {
  const onSave = vi.fn();
  render(
    <QueueEditor
      open
      onOpenChange={() => {
        // Closing is outside this field-mapping characterization.
      }}
      onSave={onSave}
    />,
  );

  await userEvent.type(screen.getByRole('textbox', { name: /code/i }), 'acc');
  await userEvent.type(screen.getByRole('textbox', { name: /^nom/i }), 'Accueil');
  const counters = screen.getByRole('spinbutton', { name: /guichets/i });
  await userEvent.clear(counters);
  await userEvent.type(counters, '4');

  await userEvent.click(screen.getByRole('button', { name: /suivant/i }));
  await userEvent.click(screen.getByRole('button', { name: /suivant/i }));
  await userEvent.click(screen.getByRole('button', { name: /terminer/i }));

  await waitFor(() => {
    expect(onSave).toHaveBeenCalledOnce();
  });
  expect(onSave.mock.calls[0]?.[0]).toMatchObject({
    queueCode: 'ACC',
    queueName: 'Accueil',
    threadCount: 4,
  });
});
