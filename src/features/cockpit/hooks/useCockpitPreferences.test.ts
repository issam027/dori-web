import { act, renderHook } from '@testing-library/react';
import { useCockpitPreferences } from './useCockpitPreferences';

describe('cockpit preferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists density and sorting for the active site', () => {
    const { result } = renderHook(() => useCockpitPreferences('site-1'));
    act(() => {
      result.current.setSort('waiting');
      result.current.setDensity('compact');
    });
    expect(result.current.sort).toBe('waiting');
    expect(result.current.density).toBe('compact');
    expect(localStorage.getItem('dori:cockpit:site-1:preferences')).toContain('compact');
  });

  it('isolates preferences by site', () => {
    localStorage.setItem(
      'dori:cockpit:site-1:preferences',
      JSON.stringify({ sort: 'name', density: 'compact' }),
    );
    const first = renderHook(() => useCockpitPreferences('site-1'));
    const second = renderHook(() => useCockpitPreferences('site-2'));
    expect(first.result.current.sort).toBe('name');
    expect(second.result.current.sort).toBe('operational');
  });

  it('persists operator display and feedback preferences', () => {
    const { result } = renderHook(() => useCockpitPreferences('site-1'));
    act(() => {
      result.current.toggleFavorite('queue-1');
      result.current.toggleCollapsed('queue-2');
      result.current.setSoundsEnabled(false);
    });

    expect(result.current.favoriteQueueIds).toEqual(['queue-1']);
    expect(result.current.collapsedQueueIds).toEqual(['queue-2']);
    expect(result.current.soundsEnabled).toBe(false);

    act(() => {
      result.current.toggleFavorite('queue-1');
      result.current.toggleCollapsed('queue-2');
    });
    expect(result.current.favoriteQueueIds).toEqual([]);
    expect(result.current.collapsedQueueIds).toEqual([]);
  });
});
