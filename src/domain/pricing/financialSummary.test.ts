import { describe, expect, it } from 'vitest';
import { calculateFinancialSummary } from './financialSummary';
import type { PricingRule } from './pricingRules';
import type { RoomRecord } from '../reports/models';
import type { RecoveryAdjustment } from '../reports/recoveryAdjustments';

const room = (roomNumber: string, reportedRate: string | null, adults: number | null = 2, children: number | null = 1): RoomRecord => ({
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
  it('uses approved recovery rates in the financial summary without a pricing rule', () => {
    const recovery: RecoveryAdjustment = {
      id: 'recovery-0826',
      targetDate: '2026-10-26',
      sourceDate: '2026-10-25',
      groupName: 'Group A',
      room: room('0826', '1030'),
      proposedRate: '1000',
      approvedRate: '1030',
      currency: 'ILS',
      included: true,
      status: 'approved',
      origin: 'previous-night-copy',
      createdAt: '2026-11-13T00:00:00.000Z',
    };
    const summary = calculateFinancialSummary([
      { reportDate: '2026-10-26', rooms: [recovery.room] },
    ], [], [recovery]);

    expect(summary.charges).toEqual([expect.objectContaining({ roomNumber: '0826', rate: '1030.00', currency: 'ILS' })]);
    expect(summary.totals).toEqual({ ILS: '1030.00', USD: '0.00' });
  });

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

  it('reports missing or unsupported occupancy separately from missing prices', () => {
    const summary = calculateFinancialSummary([
      { reportDate: '2026-10-25', rooms: [room('0524', null, null, null), room('0525', null, 4, 0)] },
    ], [rule('ils', '125.00')]);

    expect(summary.unresolvedOccupancies).toEqual([
      { reportDate: '2026-10-25', roomNumber: '0524' },
      { reportDate: '2026-10-25', roomNumber: '0525' },
    ]);
    expect(summary.missingPrices).toEqual([]);
  });
});
