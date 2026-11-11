import type { FinancialSummary } from './financialSummary';

export type FinancialValidationIssueKind = 'room-conflict' | 'pricing-conflict' | 'missing-price' | 'unresolved-occupancy';

export interface FinancialValidationIssue {
  kind: FinancialValidationIssueKind;
  count: number;
}

export interface FinancialValidation {
  canFinalize: boolean;
  issues: FinancialValidationIssue[];
}

export function validateFinancialSummary(summary: FinancialSummary): FinancialValidation {
  const issues: FinancialValidationIssue[] = [];

  if (summary.roomConflicts.length > 0) {
    issues.push({ kind: 'room-conflict', count: summary.roomConflicts.length });
  }
  if (summary.pricingConflicts.length > 0) {
    issues.push({ kind: 'pricing-conflict', count: summary.pricingConflicts.length });
  }
  if (summary.missingPrices.length > 0) {
    issues.push({ kind: 'missing-price', count: summary.missingPrices.length });
  }
  if (summary.unresolvedOccupancies.length > 0) {
    issues.push({ kind: 'unresolved-occupancy', count: summary.unresolvedOccupancies.length });
  }

  return {
    canFinalize: issues.length === 0,
    issues,
  };
}
