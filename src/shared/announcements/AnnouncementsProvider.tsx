import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { localAnnouncementsControllerList } from '@/api/generated/public-announcements/public-announcements';
import type { LocalAnnouncementsResponseDto } from '@/api/generated/models';
import { isCloudDeployment } from '@/core/config/deployment-mode';
import { useScopeStore } from '@/core/scope/scope-store';
import { useSessionStore } from '@/core/auth/session-store';
import { tabRealtimeTransport } from '@/core/realtime/tab-realtime-transport';
import { useHeartbeatHealth } from '@/core/realtime/use-heartbeat-health';
import { useDegradedRealtimeRefresh } from '@/core/realtime/use-degraded-realtime-refresh';
import { AnnouncementsContext, parseAnnouncementSnapshot } from './announcements-context';

const empty: LocalAnnouncementsResponseDto = { items: [], observedAt: '1970-01-01T00:00:00.000Z' };
export function AnnouncementsProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const user = useSessionStore((state) => state.user);
  const activeSiteId = useScopeStore((state) => state.activeSiteId);
  const [trackingQueueId, setTrackingQueueId] = useState<string>();
  const tracking = location.pathname === '/track';
  const siteId =
    !tracking && location.pathname !== '/login' && user
      ? (activeSiteId ?? (user.scope.siteIds.length === 1 ? user.scope.siteIds[0] : undefined))
      : undefined;
  const queueId = tracking ? trackingQueueId : undefined;
  const enabled = !isCloudDeployment || Boolean(siteId) || tracking;
  const viewKey = `${siteId ?? ''}:${queueId ?? ''}`;
  const [state, setState] = useState<{
    key: string;
    snapshot: LocalAnnouncementsResponseDto;
    receivedAt: number;
  }>({ key: '', snapshot: empty, receivedAt: 0 });
  const { health, heartbeat, fail } = useHeartbeatHealth(
    enabled ? ['announcements:' + viewKey] : [],
  );
  const receive = useCallback((snapshot: LocalAnnouncementsResponseDto, key: string) => {
    setState((previous) =>
      previous.key === key &&
      Date.parse(previous.snapshot.observedAt) > Date.parse(snapshot.observedAt)
        ? previous
        : { key, snapshot, receivedAt: performance.now() },
    );
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let active = true;
    // The initial REST read is retained; pushed snapshots carry all later changes.
    void localAnnouncementsControllerList({ siteId, queueId }, undefined, controller.signal)
      .then((response) => {
        if (active) receive(response.data, viewKey);
      })
      .catch(() => undefined);
    const unsubscribe = tabRealtimeTransport.subscribe(
      { kind: 'announcements', siteId },
      {
        onMessage: (message) => {
          if (message.event === 'heartbeat') {
            heartbeat('announcements:' + viewKey);
            return;
          }
          if (message.event !== 'announcements') return;
          const snapshot = parseAnnouncementSnapshot(message.data);
          if (snapshot) receive(snapshot, viewKey);
          else fail();
        },
        onStatus: (status) => {
          if (status === 'failed') fail();
        },
      },
    );
    return () => {
      active = false;
      controller.abort();
      unsubscribe();
    };
  }, [enabled, viewKey, siteId, queueId, receive, heartbeat, fail]);
  useDegradedRealtimeRefresh({
    enabled,
    health,
    refresh: async () => {
      try {
        const response = await localAnnouncementsControllerList({ siteId, queueId });
        receive(response.data, viewKey);
      } catch {
        /* An announcement must not block local operations. */
      }
    },
  });
  const value = useMemo(
    () => ({
      snapshot: enabled && state.key === viewKey ? state.snapshot : empty,
      receivedAt: state.receivedAt,
      setTrackingQueueId,
    }),
    [enabled, state, viewKey],
  );
  return <AnnouncementsContext.Provider value={value}>{children}</AnnouncementsContext.Provider>;
}
