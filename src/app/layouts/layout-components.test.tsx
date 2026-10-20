import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { CurrentUserResponseDto } from '@/api/generated/models';
import { useSessionStore } from '@/core/auth/session-store';
import { Modal } from '@/design-system/components/Modal';
import { SidebarAccordion } from './SidebarAccordion';
import { Topbar } from './Topbar';

const operator: CurrentUserResponseDto = {
  userId: 1,
  username: 'operator',
  userType: 'human',
  roles: ['operator'],
  permissions: ['registration_call', 'queue_view'],
  mustChangePassword: false,
  scope: { isGlobal: false, siteIds: [1], queueIds: [1] },
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
    const dismiss = screen.getByRole('button', { name: /annuler|cancel|common.cancel/i });
    expect(dismiss).toHaveClass('button');
    await userEvent.click(dismiss);
    expect(onOpenChange).toHaveBeenCalledWith(false);
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
          sites={[{ id: 1, name: 'Paris' }]}
          activeSiteId={1}
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
});
