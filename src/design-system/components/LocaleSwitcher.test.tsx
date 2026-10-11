import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePreferencesStore } from '@/core/theme/preferences-store';
import { LocaleSwitcher } from './LocaleSwitcher';

describe('LocaleSwitcher', () => {
  it('shows only the selected flag until the language menu is opened', async () => {
    usePreferencesStore.getState().setLocale('fr');
    const { container } = render(<LocaleSwitcher />);

    expect(container.querySelectorAll('.locale-switcher-trigger svg')).toHaveLength(2);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /langue.*français/i }));
    expect(screen.getByRole('listbox')).toBeVisible();
    expect(screen.getAllByRole('option')).toHaveLength(3);

    await userEvent.click(screen.getByRole('option', { name: /english/i }));
    expect(usePreferencesStore.getState().locale).toBe('en');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
