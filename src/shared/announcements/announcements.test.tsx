import { act, render, screen } from '@testing-library/react';
import { AnnouncementsContext, parseAnnouncementSnapshot } from './announcements-context';
import { AnnouncementsBanner } from './AnnouncementsBanner';

it('expires a notice using server time even when the browser clock differs and no update arrives', () => {
  vi.useFakeTimers();
  const now = '2026-11-04T10:00:00.000Z';
  const message = '<img src=x onerror=alert(1)>';
  const view = render(
    <AnnouncementsContext.Provider
      value={{
        snapshot: {
          observedAt: now,
          items: [
            {
              announcementId: 'notice',
              title: 'Maintenance',
              message,
              severity: 'warning',
              startsAt: now,
              endsAt: '2026-11-04T10:00:02.000Z',
            },
          ],
        },
        receivedAt: performance.now(),
        setTrackingQueueId: () => undefined,
      }}
    >
      <AnnouncementsBanner />
    </AnnouncementsContext.Provider>,
  );
  expect(screen.getByText(message)).toBeInTheDocument();
  expect(view.container.querySelector('img')).toBeNull();
  act(() => {
    vi.advanceTimersByTime(2100);
  });
  expect(screen.queryByText('Maintenance')).not.toBeInTheDocument();
  view.unmount();
  vi.useRealTimers();
});
it('rejects malformed pushed notices and strips private fields', () => {
  expect(parseAnnouncementSnapshot('{broken')).toBeUndefined();
  expect(
    parseAnnouncementSnapshot(JSON.stringify({ observedAt: 'bad', items: [] })),
  ).toBeUndefined();
  const item = {
    announcementId: 'a',
    title: 'Notice',
    message: 'Message',
    severity: 'info',
    startsAt: '2026-11-04T10:00:00Z',
    endsAt: '2026-11-05T10:00:00Z',
    targets: ['private'],
  };
  const snapshot = parseAnnouncementSnapshot(
    JSON.stringify({ observedAt: item.startsAt, items: [item] }),
  );
  expect(snapshot?.items).toHaveLength(1);
  expect(JSON.stringify(snapshot)).not.toContain('private');
  expect(
    parseAnnouncementSnapshot(
      JSON.stringify({ observedAt: item.startsAt, items: [{ ...item, severity: 'unknown' }] }),
    ),
  ).toBeUndefined();
});
