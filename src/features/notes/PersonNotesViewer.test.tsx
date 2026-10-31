import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/shared/testing/mock-server';
import { PersonNotesViewer } from './PersonNotesViewer';

it('loads notes without requesting the person detail', async () => {
  let personDetailRequests = 0;
  mockServer.use(
    http.get(
      'http://localhost:3000/api/v1/persons/00000000-0000-4000-8000-000000000042/notes',
      () =>
        HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: { page: 1, pageSize: 100, total: 0, totalPages: 0, items: [] },
        }),
    ),
    http.get('http://localhost:3000/api/v1/persons/00000000-0000-4000-8000-000000000042', () => {
      personDetailRequests += 1;
      return HttpResponse.json({ code: 'OK' });
    }),
  );

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PersonNotesViewer
        personId={'00000000-0000-4000-8000-000000000042'}
        personName="Ada Lovelace"
        open
        onOpenChange={() => undefined}
      />
    </QueryClientProvider>,
  );

  expect(await screen.findByRole('heading', { name: /aucune note/i })).toBeVisible();
  expect(screen.getByRole('dialog')).toHaveTextContent('Ada Lovelace');
  expect(personDetailRequests).toBe(0);
});

vi.mock('@/core/permissions/permissions', () => ({ hasPermission: () => true }));

function renderNotes(initialMode: 'view' | 'add' = 'view', withNotes = true) {
  const personId = '00000000-0000-4000-8000-000000000042';
  mockServer.use(
    http.get('http://localhost:3000/api/v1/persons/' + personId + '/notes', () =>
      HttpResponse.json({
        code: 'OK',
        data: {
          page: 1,
          pageSize: 100,
          total: withNotes ? 1 : 0,
          totalPages: withNotes ? 1 : 0,
          items: withNotes
            ? [
                {
                  noteId: '00000000-0000-4000-8000-000000000043',
                  personId,
                  content: 'Note existante',
                  authorUsername: 'Ada',
                  createdAt: '2026-10-31T10:00:00Z',
                },
              ]
            : [],
        },
      }),
    ),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Harness() {
    const [open, setOpen] = useState(true);
    return (
      <QueryClientProvider client={client}>
        {open ? (
          <PersonNotesViewer
            personId={personId}
            personName="Ada Lovelace"
            open
            initialMode={initialMode}
            onOpenChange={setOpen}
          />
        ) : null}
      </QueryClientProvider>
    );
  }
  render(<Harness />);
  return userEvent.setup();
}

it.each([true, false])(
  'closes direct creation on cancel (existing notes: %s)',
  async (withNotes) => {
    const user = renderNotes('add', withNotes);
    await user.type(await screen.findByRole('textbox'), 'Brouillon');
    await user.click(screen.getByRole('button', { name: /^annuler$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  },
);

it('closes creation started from consultation instead of returning to the note', async () => {
  const user = renderNotes();
  await screen.findByText('Note existante');
  await user.click(screen.getByRole('button', { name: /^ajouter$/i }));
  await user.type(screen.getByRole('textbox'), 'Brouillon');
  await user.click(screen.getByRole('button', { name: /^annuler$/i }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it.each(['close', 'escape'])('closes the editor with %s', async (action) => {
  const user = renderNotes('add');
  await user.type(await screen.findByRole('textbox'), 'Brouillon');
  if (action === 'close') await user.click(screen.getByRole('button', { name: /^fermer$/i }));
  else await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it.each(['add', 'edit'])(
  'returns explicitly to consultation and discards the %s draft',
  async (mode) => {
    const user = renderNotes();
    await screen.findByText('Note existante');
    await user.click(
      screen.getByRole('button', { name: mode === 'add' ? /^ajouter$/i : /^modifier$/i }),
    );
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'Brouillon abandonne');
    await user.click(screen.getByRole('button', { name: /retour aux notes/i }));
    expect(screen.getByText('Note existante')).toBeVisible();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^fermer$/i })).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: /^ajouter$/i }));
    expect(screen.getByRole('textbox')).toHaveValue('');
  },
);

it('closes editing on cancel', async () => {
  const user = renderNotes();
  await screen.findByText('Note existante');
  await user.click(screen.getByRole('button', { name: /^modifier$/i }));
  await user.click(screen.getByRole('button', { name: /^annuler$/i }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
