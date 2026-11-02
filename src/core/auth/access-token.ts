let accessToken: string | null = null;
let generation = 0;
let channel: BroadcastChannel | null = null;
let lastMessageAt = 0;
let sharedSessionEnded = false;
const endedListeners = new Set<() => void>();

export function getAccessToken(): string | null {
  return accessToken;
}
export function getSessionGeneration(): number {
  return generation;
}
export function setAccessToken(token: string): void {
  accessToken = token;
  sharedSessionEnded = false;
  lastMessageAt = Date.now();
  channel?.postMessage({ type: 'access-token', token, at: lastMessageAt });
}
export function clearAccessToken(): void {
  accessToken = null;
  generation++;
}
export function publishSessionEnded(): void {
  sharedSessionEnded = true;
  lastMessageAt = Date.now();
  channel?.postMessage({ type: 'session-ended', at: lastMessageAt });
}

/** Same-origin only. Credentials are exchanged in memory, never persisted. */
export function startAccessTokenSync(onSessionEnded: () => void): () => void {
  endedListeners.add(onSessionEnded);
  if (!channel && typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel('dori-session');
    channel.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (!event.data || typeof event.data !== 'object') return;
      const message = event.data as Record<string, unknown>;
      if (
        typeof message.at !== 'number' ||
        !Number.isFinite(message.at) ||
        message.at < lastMessageAt
      )
        return;
      if (
        message.type === 'access-token' &&
        typeof message.token === 'string' &&
        message.token &&
        !sharedSessionEnded
      ) {
        lastMessageAt = message.at;
        accessToken = message.token;
      } else if (message.type === 'session-ended') {
        lastMessageAt = message.at;
        sharedSessionEnded = true;
        clearAccessToken();
        endedListeners.forEach((listener) => {
          listener();
        });
      }
    });
  }
  return () => {
    endedListeners.delete(onSessionEnded);
    if (!endedListeners.size) {
      channel?.close();
      channel = null;
    }
  };
}
