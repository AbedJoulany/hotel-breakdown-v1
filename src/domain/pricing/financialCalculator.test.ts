import { describe, expect, it } from 'vitest';
import { calculateFinancialPreview } from './financialCalculator';
import type { CanonicalExportModel } from '../export/models';

function model(rate: string, currency: 'ILS' | 'USD' = 'ILS', complete = true): CanonicalExportModel {
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
    expect(calculateFinancialPreview(model('10.125'), 'english-ils').totals.ILS).toBe('20.25');
    expect(calculateFinancialPreview(model('0'), 'english-ils').totals.ILS).toBe('0');
    expect(calculateFinancialPreview(model('-10'), 'english-ils').totals.ILS).toBe('-20');
  });

  it('applies VAT only to Hebrew ILS calculations', () => {
    expect(calculateFinancialPreview(model('100', 'ILS'), 'hebrew').totals.ILS).toBe('236');
    expect(calculateFinancialPreview(model('100', 'ILS'), 'english-ils').totals.ILS).toBe('200');
  });

  it('leaves totals blank when a night is financially incomplete', () => {
    const result = calculateFinancialPreview(model('100', 'ILS', false), 'english-ils');
    expect(result.rows[0].amount).toBeNull();
    expect(result.totals.ILS).toBeNull();
    expect(result.nightlyTotals['2026-10-24'].ILS).toBeNull();
  });

  it('adds Hebrew VAT to ILS additional charges and keeps USD separate', () => {
    const base = model('100', 'ILS');
    const result = calculateFinancialPreview({
      ...base,
      additionalCharges: [{
        id: 'charge-1', description: 'Breakfast', price: { kind: 'numeric', value: '25' },
        quantity: { kind: 'numeric', value: '2' }, number: { kind: 'numeric', value: '1' },
        currency: 'ILS', financialCompleteness: 'complete', issues: [],
      }],
    }, 'hebrew');
    expect(result.additionalRows[0].amount).toBe('59');
    expect(result.totals.ILS).toBe('295');
  });

  it('keeps Free and Staff amounts separate from financial totals', () => {
    const base = model('100', 'ILS');
    const result = calculateFinancialPreview({
      ...base,
      complimentaryStaff: [{
        id: 'staff-1', type: 'staff', amount: { kind: 'numeric', value: '30' },
        number: { kind: 'numeric', value: '2' }, currency: 'ILS', completeness: 'complete', issues: [],
      }],
    }, 'hebrew');
    expect(result.complimentaryStaffRows[0].amount).toBe('70.8');
    expect(result.totals.ILS).toBe('306.8');
  });
});
