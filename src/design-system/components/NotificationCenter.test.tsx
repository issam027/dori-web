import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { notify, useNotificationStore } from '@/core/notifications/notification-store';
import { NotificationCenter } from './NotificationCenter';

describe('NotificationCenter', () => {
  afterEach(() => {
    useNotificationStore.getState().clear();
    vi.useRealTimers();
  });

  it('shows, deduplicates and dismisses a global notification', () => {
    render(<NotificationCenter />);
    act(() => {
      notify({ tone: 'error', title: 'Action impossible', message: 'Réessayez.' });
      notify({ tone: 'error', title: 'Action impossible', message: 'Réessayez.' });
    });
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    act(() => {
      screen.getByRole('button', { name: /fermer/i }).click();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('automatically expires a success notification', async () => {
    vi.useFakeTimers();
    render(<NotificationCenter />);
    act(() => {
      notify({ tone: 'success', title: 'Terminé', duration: 100 });
    });
    expect(screen.getByRole('status')).toBeVisible();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(101);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
