import { describe, expect, it } from 'vitest';
import { slaTone } from './sla';

describe('SLA presentation', () => {
  it('derives the visual tone only from current API metrics', () => {
    expect(slaTone(2, 5)).toBe('success');
    expect(slaTone(8, 10)).toBe('warning');
    expect(slaTone(2, 30)).toBe('danger');
  });
});
