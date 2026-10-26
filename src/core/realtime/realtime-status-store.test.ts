import { getRealtimeConnection, useRealtimeStatusStore } from './realtime-status-store';

describe('realtime status store', () => {
  beforeEach(() => {
    useRealtimeStatusStore.setState({ connections: {} });
  });

  it('tracks connection status and clears the last error after recovery', () => {
    const state = useRealtimeStatusStore.getState();

    state.updateStatus('display', 'queue-1', 'reconnecting');
    state.reportError('display', 'queue-1', new Error('network unavailable'));

    expect(getRealtimeConnection('display', 'queue-1')).toMatchObject({
      status: 'reconnecting',
      lastError: 'network unavailable',
    });

    state.updateStatus('display', 'queue-1', 'connected');

    expect(getRealtimeConnection('display', 'queue-1')).toMatchObject({
      status: 'connected',
      lastError: undefined,
    });
  });
});
