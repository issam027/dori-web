export type RealtimeListener<TSnapshot> = (snapshot: TSnapshot) => void;

export interface RealtimeGateway<TSnapshot> {
  connect: () => Promise<void>;
  disconnect: () => void;
  refresh: () => Promise<void>;
  subscribe: (listener: RealtimeListener<TSnapshot>) => () => void;
}

export class PollingRealtimeGateway<TSnapshot> implements RealtimeGateway<TSnapshot> {
  private readonly listeners = new Set<RealtimeListener<TSnapshot>>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor(
    private readonly getSnapshot: () => Promise<TSnapshot>,
    private readonly intervalMs = 15_000,
  ) {}

  async connect(): Promise<void> {
    if (this.timer) return;
    await this.refresh();
    this.timer = setInterval(() => {
      void this.refresh();
    }, this.intervalMs);
  }

  disconnect(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async refresh(): Promise<void> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.getSnapshot()
        .then((snapshot) => {
          this.listeners.forEach((listener) => {
            listener(snapshot);
          });
        })
        .finally(() => {
          this.refreshPromise = null;
        });
    }
    return this.refreshPromise;
  }

  subscribe(listener: RealtimeListener<TSnapshot>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
