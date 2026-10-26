import { resolveDisplayQueueIds } from './usePublicExperiences';

describe('resolveDisplayQueueIds', () => {
  it('uses the unique queue ids returned by the current user scope', () => {
    expect(resolveDisplayQueueIds(['queue-2', 'queue-1', 'queue-1'])).toEqual([
      'queue-2',
      'queue-1',
    ]);
  });

  it('accepts an URL queue only when it belongs to the current user scope', () => {
    expect(resolveDisplayQueueIds(['queue-1', 'queue-2'], 'queue-2')).toEqual(['queue-2']);
    expect(resolveDisplayQueueIds(['queue-1', 'queue-2'], 'queue-3')).toEqual([]);
  });
});
