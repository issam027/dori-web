import { createContext, useContext, useEffect, useState } from 'react';
import type { AnnouncementItemDto, LocalAnnouncementsResponseDto } from '@/api/generated/models';

export interface AnnouncementState {
  snapshot: LocalAnnouncementsResponseDto;
  receivedAt: number;
  setTrackingQueueId: (id: string | undefined) => void;
}
export const AnnouncementsContext = createContext<AnnouncementState>({
  snapshot: { items: [], observedAt: '1970-01-01T00:00:00.000Z' },
  receivedAt: 0,
  setTrackingQueueId: () => undefined,
});
export function parseAnnouncementSnapshot(text: string): LocalAnnouncementsResponseDto | undefined {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') return undefined;
    const value = parsed as Record<string, unknown>;
    if (
      typeof value.observedAt !== 'string' ||
      !Number.isFinite(Date.parse(value.observedAt)) ||
      !Array.isArray(value.items) ||
      value.items.length > 100
    )
      return undefined;
    const items: AnnouncementItemDto[] = [];
    for (const entry of value.items as unknown[]) {
      if (!entry || typeof entry !== 'object') return undefined;
      const item = entry as Record<string, unknown>;
      if (
        typeof item.announcementId !== 'string' ||
        typeof item.title !== 'string' ||
        !item.title.trim() ||
        item.title.length > 120 ||
        typeof item.message !== 'string' ||
        !item.message.trim() ||
        item.message.length > 2000 ||
        (item.severity !== 'info' && item.severity !== 'warning' && item.severity !== 'critical') ||
        typeof item.startsAt !== 'string' ||
        typeof item.endsAt !== 'string' ||
        !Number.isFinite(Date.parse(item.startsAt)) ||
        !Number.isFinite(Date.parse(item.endsAt))
      )
        return undefined;
      items.push({
        announcementId: item.announcementId,
        title: item.title,
        message: item.message,
        severity: item.severity,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
      });
    }
    return { items, observedAt: value.observedAt };
  } catch {
    return undefined;
  }
}
export function useAnnouncementTrackingQueue(queueId: string | undefined): void {
  const { setTrackingQueueId } = useContext(AnnouncementsContext);
  useEffect(() => {
    setTrackingQueueId(queueId);
    return () => {
      setTrackingQueueId(undefined);
    };
  }, [queueId, setTrackingQueueId]);
}
/** Local expiry uses server time plus monotonic elapsed time; it makes no network request. */
export function useVisibleAnnouncements(): AnnouncementItemDto[] {
  const { snapshot, receivedAt } = useContext(AnnouncementsContext);
  const [clock, setClock] = useState(() => ({ snapshot, now: Date.parse(snapshot.observedAt) }));
  const now = clock.snapshot === snapshot ? clock.now : Date.parse(snapshot.observedAt);
  useEffect(() => {
    let timer: number;
    const update = () => {
      const current = Date.parse(snapshot.observedAt) + Math.max(0, performance.now() - receivedAt);
      setClock({ snapshot, now: current });
      const deadlines = snapshot.items
        .map((item) => Date.parse(item.endsAt))
        .filter((end) => end > current);
      if (deadlines.length)
        timer = window.setTimeout(
          update,
          Math.min(2147483647, Math.max(1, Math.min(...deadlines) - current + 10)),
        );
    };
    timer = window.setTimeout(update, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [snapshot, receivedAt]);
  return snapshot.items.filter((item) => Date.parse(item.endsAt) > now);
}
