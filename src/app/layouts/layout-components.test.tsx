import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { CurrentUserResponseDto } from '@/api/generated/models';
import { useSessionStore } from '@/core/auth/session-store';
import { Modal } from '@/design-system/components/Modal';
import { SidebarAccordion } from './SidebarAccordion';
import { SiteContextSwitcher } from './SiteContextSwitcher';

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

    expect(screen.getByRole('link', { name: /desk/i })).toBeVisible();
    expect(screen.queryByRole('link', { name: /param/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /exp/i }));
    expect(screen.getByRole('link', { name: /display|affichage/i })).toBeVisible();
    expect(screen.queryByRole('link', { name: /desk/i })).not.toBeInTheDocument();
  });

  it('uses a static site label for mono-site users and a selector otherwise', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <SiteContextSwitcher
        sites={[{ id: 1, name: 'Paris' }]}
        activeSiteId={1}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByText('Paris')).toBeVisible();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    rerender(
      <SiteContextSwitcher
        sites={[
          { id: 1, name: 'Paris' },
          { id: 2, name: 'Lyon' },
        ]}
        activeSiteId={1}
        onSelect={onSelect}
      />,
    );
    await userEvent.selectOptions(screen.getByRole('combobox'), '2');
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('exposes an accessible modal and returns the close intent', async () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} title="Confirmation" description="Description">
        Contenu
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Confirmation' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /fermer|close/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
