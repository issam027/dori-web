import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  announcementsControllerCreate,
  announcementsControllerList,
  announcementsControllerWithdraw,
} from '@/api/generated/announcements/announcements';
import type { CreateAnnouncementDto } from '@/api/generated/models';
import { tabRealtimeTransport } from '@/core/realtime/tab-realtime-transport';
import { useHeartbeatHealth } from '@/core/realtime/use-heartbeat-health';
import { useDegradedRealtimeRefresh } from '@/core/realtime/use-degraded-realtime-refresh';

export const announcementKeys = {
  all: ['announcements'] as const,
  list: (scope: CreateAnnouncementDto['scope'], page: number) =>
    ['announcements', scope, page] as const,
};
export function useAnnouncements(scope: CreateAnnouncementDto['scope'], page: number) {
  return useQuery({
    queryKey: announcementKeys.list(scope, page),
    queryFn: ({ signal }) =>
      announcementsControllerList({ scope, page, pageSize: 10 }, undefined, signal),
  });
}
export function usePublishAnnouncement() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAnnouncementDto) => announcementsControllerCreate(body),
    onSuccess: () => client.invalidateQueries({ queryKey: announcementKeys.all }),
  });
}
export function useWithdrawAnnouncement() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => announcementsControllerWithdraw(id),
    onSuccess: () => client.invalidateQueries({ queryKey: announcementKeys.all }),
  });
}
export function useAnnouncementAdministrationRealtime() {
  const client = useQueryClient();
  const { health, heartbeat, fail } = useHeartbeatHealth(['announcement-administration']);
  useEffect(
    () =>
      tabRealtimeTransport.subscribe(
        { kind: 'announcements-admin' },
        {
          onOpen: () => {
            void client.invalidateQueries({ queryKey: announcementKeys.all });
          },
          onMessage: (event) => {
            if (event.event === 'heartbeat') heartbeat('announcement-administration');
            if (event.event === 'announcements_changed')
              void client.invalidateQueries({ queryKey: announcementKeys.all });
          },
          onStatus: (status) => {
            if (status === 'failed') fail();
          },
        },
      ),
    [client, heartbeat, fail],
  );
  useDegradedRealtimeRefresh({
    health,
    enabled: true,
    refresh: async () => {
      await client.refetchQueries({ queryKey: announcementKeys.all, type: 'active' });
    },
  });
  return health;
}
