import { describe, expect, it } from 'vitest';
import { validateFinancialSummary } from './financialValidation';
import type { FinancialSummary } from './financialSummary';

function summary(overrides: Partial<FinancialSummary> = {}): FinancialSummary {
  return {
    charges: [],
    totals: { ILS: '0.00', USD: '0.00' },
    missingPrices: [],
    pricingConflicts: [],
    roomConflicts: [],
    ...overrides,
  };
}

describe('validateFinancialSummary', () => {
  it('allows finalization when there are no blocking issues', () => {
    expect(validateFinancialSummary(summary())).toEqual({ canFinalize: true, issues: [] });
  });

  it('reports every blocking issue category without resolving it automatically', () => {
    const result = validateFinancialSummary(summary({
      roomConflicts: [{ reportDate: '2026-10-24', roomNumber: '101' }],
      pricingConflicts: [{ reportDate: '2026-10-24', roomNumber: '102', ruleIds: ['rule-1', 'rule-2'] }],
      missingPrices: [{ reportDate: '2026-10-24', roomNumber: '103', roomType: 'STR', reason: 'missing-rule' }],
    }));

    expect(result).toEqual({
      canFinalize: false,
      issues: [
        { kind: 'room-conflict', count: 1 },
        { kind: 'pricing-conflict', count: 1 },
        { kind: 'missing-price', count: 1 },
      ],
    });
  });

  it('treats invalid rates as missing-price blockers', () => {
    const result = validateFinancialSummary(summary({
      missingPrices: [{ reportDate: '2026-10-24', roomNumber: '103', roomType: 'STR', reason: 'invalid-rate' }],
    }));

    expect(result.canFinalize).toBe(false);
    expect(result.issues).toEqual([{ kind: 'missing-price', count: 1 }]);
  });
});

