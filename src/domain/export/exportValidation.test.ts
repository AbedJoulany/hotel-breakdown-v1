import { describe, expect, it } from 'vitest';
import { validateExport } from './exportValidation';
import type { CanonicalExportModel } from './models';

const model: CanonicalExportModel = {
  metadata: { hotelName: null, groupName: 'Group A', checkInDate: null, checkOutDate: null, reportDates: [], currencies: ['ILS', 'USD'] },
  nights: [],
  additionalCharges: [{
    id: 'charge-1', description: 'Breakfast', price: { kind: 'numeric', value: '10' },
    quantity: { kind: 'numeric', value: '1' }, number: { kind: 'numeric', value: '1' },
    currency: 'USD', financialCompleteness: 'complete', issues: [],
  }],
  warnings: [],
};

describe('validateExport', () => {
  it('warns when a charge currency does not match the selected template', () => {
    const result = validateExport(model, 'hebrew');
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'currency-mismatch', severity: 'warning' }),
    ]));
    expect(result.canFinal).toBe(true);
  });

  it('blocks Draft and Final until Folio Comparison is complete', () => {
    const result = validateExport(model, 'usd', false);
    expect(result.canDraft).toBe(false);
    expect(result.canFinal).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'folio-comparison-required', severity: 'warning' }),
    ]));
  });
});
