import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { CurrentUserResponseDto } from '@/api/generated/models';
import { useSessionStore } from '@/core/auth/session-store';
import { Modal } from '@/design-system/components/Modal';
import { SidebarAccordion } from './SidebarAccordion';
import { Topbar } from './Topbar';

const operator: CurrentUserResponseDto = {
  userId: '00000000-0000-4000-8000-000000000001',
  username: 'operator',
  userType: 'human',
  roles: ['operator'],
  permissions: ['registration_call', 'queue_view'],
  mustChangePassword: false,
  scope: {
    isGlobal: false,
    siteIds: ['00000000-0000-4000-8000-000000000001'],
    queueIds: ['00000000-0000-4000-8000-000000000001'],
  },
};

afterEach(() => {
  useSessionStore.getState().clear();
});

describe('application layout', () => {
  it('shows only authorized navigation and opens one section at a time', async () => {
    useSessionStore.getState().authenticate(operator);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/desk']}>
        <SidebarAccordion />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /cockpit|desk/i })).toBeVisible();
    expect(screen.queryByRole('link', { name: /param/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /exp/i }));
    expect(screen.getByRole('link', { name: /display|affichage|écran salle/i })).toBeVisible();
    expect(screen.queryByRole('link', { name: /cockpit|desk/i })).not.toBeInTheDocument();
  });

  it('exposes an accessible modal and returns the close intent', async () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} title="Confirmation" description="Description">
        Contenu
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Confirmation' })).toBeVisible();
    const close = screen.getByRole('button', { name: /fermer|close|common.close/i });
    expect(close).toHaveClass('dialog-header-close');
    const dismiss = screen.getByRole('button', { name: /annuler|cancel|common.cancel/i });
    expect(dismiss).toHaveClass('button');
    await userEvent.click(dismiss);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows the Dorify loader in a loading modal', () => {
    render(
      <Modal open loading onOpenChange={vi.fn()} title="Chargement">
        Contenu différé
      </Modal>,
    );

    expect(screen.getByRole('status')).toBeVisible();
    expect(screen.queryByText('Contenu différé')).not.toBeInTheDocument();
  });

  it('can omit the default cancel action for a completed modal state', () => {
    render(
      <Modal
        open
        hideDismissAction
        onOpenChange={vi.fn()}
        title="Opération terminée"
        actions={<button type="button">Terminer</button>}
      >
        Résultat
      </Modal>,
    );

    expect(screen.getByRole('button', { name: 'Terminer' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /annuler|cancel|common.cancel/i }),
    ).not.toBeInTheDocument();
  });

  it('groups profile, language and logout in the compact account menu', async () => {
    useSessionStore.getState().authenticate(operator);
    const logout = vi.fn();
    render(
      <MemoryRouter initialEntries={['/desk']}>
        <Topbar
          sites={[{ id: '00000000-0000-4000-8000-000000000001', name: 'Paris' }]}
          activeSiteId={'00000000-0000-4000-8000-000000000001'}
          pageHeaderVisible={false}
          onLogout={logout}
          onOpenCommands={vi.fn()}
          onRefresh={vi.fn()}
          refreshing={false}
          onOpenNavigation={vi.fn()}
        />
      </MemoryRouter>,
    );

    const compactAccount = document.querySelector('.mobile-account-trigger');
    expect(compactAccount).toBeInTheDocument();
    expect(compactAccount).toHaveClass('topbar-icon-button', 'mobile-account-trigger');
    expect(compactAccount).not.toHaveClass('button');
    await userEvent.click(compactAccount as HTMLElement);
    const menu = screen.getByRole('menu');
    expect(menu).toHaveTextContent(/mon profil/i);
    expect(menu).toHaveTextContent(/langue/i);
    await userEvent.click(screen.getByRole('menuitem', { name: /déconnexion/i }));
    expect(logout).toHaveBeenCalledOnce();
  });

  it('shows the active site prominently while the page title is visible', () => {
    const props = {
      sites: [{ id: '00000000-0000-4000-8000-000000000001', name: 'Centre Horizon' }],
      activeSiteId: '00000000-0000-4000-8000-000000000001',
      onLogout: vi.fn(),
      onOpenCommands: vi.fn(),
      onRefresh: vi.fn(),
      refreshing: false,
      onOpenNavigation: vi.fn(),
    };
    const { rerender } = render(
      <MemoryRouter initialEntries={['/desk']}>
        <Topbar {...props} pageHeaderVisible />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Centre Horizon' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: /cockpit/i })).not.toBeInTheDocument();

    rerender(
      <MemoryRouter initialEntries={['/desk']}>
        <Topbar {...props} pageHeaderVisible={false} />
      </MemoryRouter>,
    );

    expect(document.querySelector('.topbar-title-route .eyebrow')).toHaveTextContent(
      'Centre Horizon',
    );
    expect(screen.getByRole('heading', { name: /cockpit/i })).toBeVisible();
  });

  it.each([
    ['/settings', /param.tres du site/i],
    ['/settings/sites', /param.tres du site/i],
    ['/settings/queues', /param.tres du site/i],
    ['/settings/tiers', /param.tres du site/i],
    ['/admin/users', /utilisateurs/i],
    ['/onboarding', /cr.er un site/i],
    ['/admin/translations', /traductions/i],
    ['/health', /plateforme/i],
  ])('shows the page title for the %s route', (path, title) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <Topbar
          sites={[{ id: '00000000-0000-4000-8000-000000000001', name: 'Centre Horizon' }]}
          activeSiteId={'00000000-0000-4000-8000-000000000001'}
          pageHeaderVisible={false}
          onLogout={vi.fn()}
          onOpenCommands={vi.fn()}
          onRefresh={vi.fn()}
          refreshing={false}
          onOpenNavigation={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: title })).toBeVisible();
  });
});
