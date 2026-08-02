import { describe, expect, it } from 'vitest';

import { formatSlotCount } from './plural';

describe('formatSlotCount', () => {
  it('согласует слово «слот» с числом', () => {
    expect(formatSlotCount(1)).toBe('1 слот');
    expect(formatSlotCount(2)).toBe('2 слота');
    expect(formatSlotCount(4)).toBe('4 слота');
    expect(formatSlotCount(5)).toBe('5 слотов');
    expect(formatSlotCount(11)).toBe('11 слотов');
    expect(formatSlotCount(21)).toBe('21 слот');
  });
});
