import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import type { CurrentUserResponseDto } from '@/api/generated/models';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionIdleWatchdog } from './SessionIdleWatchdog';
import { sessionIdleMilliseconds } from './session-idle-policy';
import { useSessionStore } from './session-store';

const { clearSession } = vi.hoisted(() => ({
  clearSession: vi.fn(() => Promise.resolve()),
}));

vi.mock('./session-actions', () => ({ clearSession }));

function authenticateAs(userType: 'human' | 'kiosk') {
  useSessionStore.setState({
    status: 'authenticated',
    user: { userType } as CurrentUserResponseDto,
  });
}

function renderWatchdog() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SessionIdleWatchdog />
    </QueryClientProvider>,
  );
}

describe('SessionIdleWatchdog', () => {
  afterEach(() => {
    vi.useRealTimers();
    clearSession.mockClear();
    useSessionStore.setState({ status: 'anonymous', user: null });
  });

  it('parses the configured duration with a safe fallback', () => {
    expect(sessionIdleMilliseconds('15')).toBe(900_000);
    expect(sessionIdleMilliseconds('invalid')).toBe(1_800_000);
    expect(sessionIdleMilliseconds('0')).toBe(1_800_000);
  });

  it('disconnects an inactive human user', () => {
    vi.useFakeTimers();
    authenticateAs('human');
    renderWatchdog();

    act(() => {
      vi.advanceTimersByTime(1_800_000);
    });

    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it('never disconnects a kiosk for inactivity', () => {
    vi.useFakeTimers();
    authenticateAs('kiosk');
    renderWatchdog();

    act(() => {
      vi.advanceTimersByTime(3_600_000);
    });

    expect(clearSession).not.toHaveBeenCalled();
  });
});
