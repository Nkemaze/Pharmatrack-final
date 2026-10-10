import { describe, expect, it } from 'vitest';
import { signOf } from '../src/lib/stock.js';

describe('stock signOf', () => {
  it('treats receipts and returns as incoming', () => {
    expect(signOf('RECEIPT')).toBe(1);
    expect(signOf('RETURN')).toBe(1);
  });

  it('treats sales, transfers, destructions and losses as outgoing', () => {
    for (const type of ['SALE', 'TRANSFER', 'DESTRUCTION', 'LOSS']) {
      expect(signOf(type)).toBe(-1);
    }
  });

  it('uses the direction for adjustments', () => {
    expect(signOf('ADJUSTMENT', 'INCREASE')).toBe(1);
    expect(signOf('ADJUSTMENT', 'DECREASE')).toBe(-1);
  });
});