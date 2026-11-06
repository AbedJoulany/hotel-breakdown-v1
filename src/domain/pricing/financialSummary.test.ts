import { describe, expect, it } from 'vitest';
import { calculateFinancialSummary } from './financialSummary';
import type { PricingRule } from './pricingRules';
import type { RoomRecord } from '../reports/models';

const room = (roomNumber: string, reportedRate: string | null, adults = 2, children = 1): RoomRecord => ({
  roomNumber,
  guestName: 'Guest',
  reservationNumber: null,
  bookedRoomType: 'STR',
  actualRoomType: 'STR',
  blockCode: null,
  fromDate: null,
  toDate: null,
  adults,
  children,
  babies: null,
  rooms: 1,
  rateCode: null,
  reportedRate,
});

const rule = (id: string, rate: string, currency: PricingRule['currency'] = 'ILS', adults = 2, children = 1): PricingRule => ({
  id,
  reportDate: '2026-10-25',
  roomType: 'STR',
  adults,
  children,
  rate,
  currency,
});

describe('calculateFinancialSummary', () => {
  it('calculates one room-night and keeps currency totals separate', () => {
    const summary = calculateFinancialSummary([
      { reportDate: '2026-10-25', rooms: [room('0524', null), room('0525', null, 1, 0)] },
    ], [rule('ils', '125.505'), rule('usd', '20.00', 'USD', 1, 0)]);

    expect(summary.charges).toEqual([
      expect.objectContaining({ roomNumber: '0524', rate: '125.51', currency: 'ILS' }),
      expect.objectContaining({ roomNumber: '0525', rate: '20.00', currency: 'USD' }),
    ]);
    expect(summary.totals).toEqual({ ILS: '125.51', USD: '20.00' });
  });

  it('reports missing prices without treating them as zero charges', () => {
    const summary = calculateFinancialSummary([
      { reportDate: '2026-10-25', rooms: [room('0524', null)] },
    ], []);

    expect(summary.charges).toEqual([]);
    expect(summary.missingPrices).toEqual([
      { reportDate: '2026-10-25', roomNumber: '0524', roomType: 'STR', reason: 'missing-rule' },
    ]);
    expect(summary.totals.ILS).toBe('0.00');
  });

  it('does not price a room with an unresolved duplicate-room conflict', () => {
    const summary = calculateFinancialSummary([
      { reportDate: '2026-10-25', rooms: [room('0524', null), { ...room('0524', null), adults: 3 }] },
    ], [rule('ils', '125.00')]);

    expect(summary.charges).toEqual([]);
    expect(summary.roomConflicts).toEqual([{ reportDate: '2026-10-25', roomNumber: '0524' }]);
  });
});

