import { describe, expect, it } from 'vitest';
import { calculateFinancialPreview } from './financialCalculator';
import type { CanonicalExportModel } from '../export/models';

function model(rate: string, currency: 'ILS' | 'USD' = 'USD', complete = true): CanonicalExportModel {
  return {
    metadata: { hotelName: null, groupName: 'Group A', checkInDate: '2026-10-24', checkOutDate: '2026-10-24', reportDates: ['2026-10-24'], currencies: [currency] },
    warnings: complete ? [] : [{ code: 'missing-price', severity: 'final-blocker', affects: 'financial', message: 'Missing', sourceFactIds: ['fact-1'] }],
    nights: [{
      reportDate: '2026-10-24',
      dataCompleteness: complete ? 'complete' : 'incomplete',
      financialCompleteness: complete ? 'complete' : 'incomplete',
      roomCharges: [{
        groupedRowId: 'row-1',
        groupingKey: { reportDate: '2026-10-24', bookedRoomType: 'STR', occupancyCategory: 'double-child', rateKey: `numeric:${rate}`, currency },
        reportDate: '2026-10-24', bookedRoomType: 'STR', adults: 2, children: 1, occupancyCategory: 'double-child', roomCount: 2, nights: 1,
        rate: { kind: 'numeric', value: rate }, currency, pricingStatus: complete ? 'resolved' : 'missing-price', dataCompleteness: complete ? 'complete' : 'incomplete', financialCompleteness: complete ? 'complete' : 'incomplete', issues: complete ? [] : [{ code: 'missing-price', severity: 'final-blocker', affects: 'financial', message: 'Missing', sourceFactIds: ['fact-1'] }], sourceRefs: [],
      }],
    }],
  };
}

describe('calculateFinancialPreview', () => {
  it('supports positive, zero, negative and precise rates', () => {
    expect(calculateFinancialPreview(model('10.125'), 'usd').totals.USD).toBe('20.25');
    expect(calculateFinancialPreview(model('0'), 'usd').totals.USD).toBe('0');
    expect(calculateFinancialPreview(model('-10'), 'usd').totals.USD).toBe('-20');
  });

  it('applies VAT only to Hebrew ILS calculations', () => {
    expect(calculateFinancialPreview(model('100', 'ILS'), 'hebrew').totals.ILS).toBe('236');
    expect(calculateFinancialPreview(model('100', 'USD'), 'usd').totals.USD).toBe('200');
  });

  it('leaves totals blank when a night is financially incomplete', () => {
    const result = calculateFinancialPreview(model('100', 'USD', false), 'usd');
    expect(result.rows[0].amount).toBeNull();
    expect(result.totals.USD).toBeNull();
    expect(result.nightlyTotals['2026-10-24'].USD).toBeNull();
  });
});
