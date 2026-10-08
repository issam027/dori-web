import { nextTheme, themes } from './theme';

describe('theme cycle', () => {
  it('cycles through all four themes in the specified order', () => {
    expect(themes).toEqual(['light', 'soft-light', 'soft-dark', 'dark']);
    expect(nextTheme('light')).toBe('soft-light');
    expect(nextTheme('soft-light')).toBe('soft-dark');
    expect(nextTheme('soft-dark')).toBe('dark');
    expect(nextTheme('dark')).toBe('light');
  });
});
