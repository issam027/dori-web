import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  announcementsControllerCreate,
  announcementsControllerList,
  announcementsControllerDetail,
  announcementsControllerUpdate,
  announcementsControllerWithdraw,
} from '@/api/generated/announcements/announcements';
import type {
  CreateAnnouncementDto,
  AnnouncementsControllerListParams,
} from '@/api/generated/models';
import { tabRealtimeTransport } from '@/core/realtime/tab-realtime-transport';
import { useHeartbeatHealth } from '@/core/realtime/use-heartbeat-health';
import { useDegradedRealtimeRefresh } from '@/core/realtime/use-degraded-realtime-refresh';

export const announcementKeys = {
  all: ['announcements'] as const,
  list: (query: AnnouncementsControllerListParams) => ['announcements', 'list', query] as const,
  detail: (id?: string) => ['announcements', 'detail', id] as const,
};
export function useAnnouncements(query: AnnouncementsControllerListParams, enabled = true) {
  return useQuery({
    queryKey: announcementKeys.list(query),
    queryFn: ({ signal }) => announcementsControllerList(query, undefined, signal),
    enabled,
  });
}
export function useAnnouncement(id?: string) {
  return useQuery({
    queryKey: announcementKeys.detail(id),
    queryFn: ({ signal }) => announcementsControllerDetail(id ?? '', undefined, signal),
    enabled: Boolean(id),
  });
}
export function useSaveAnnouncement(id?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAnnouncementDto) => {
      const { targetIds, title, message, severity, startsAt, endsAt } = body;
      const update = { targetIds, title, message, severity, startsAt, endsAt };
      return id ? announcementsControllerUpdate(id, update) : announcementsControllerCreate(body);
    },
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
