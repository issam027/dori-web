import { serializeFilters } from './serialize-filters';

describe('serializeFilters', () => {
  it('omits empty values and keeps meaningful false and zero values', () => {
    const result = serializeFilters({
      page: 0,
      active: false,
      search: '',
      queueId: undefined,
      siteId: null,
      status: 'waiting',
    });

    expect(result.toString()).toBe('page=0&active=false&status=waiting');
  });
});
