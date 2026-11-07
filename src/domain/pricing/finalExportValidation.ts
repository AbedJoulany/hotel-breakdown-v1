import type { FinancialValidation } from './financialValidation';

export type FinalExportBlocker = 'financial-validation' | 'folio-warnings-not-acknowledged';

export interface FinalExportValidationInput {
  financialValidation: FinancialValidation;
  folioWarningCount: number;
  folioWarningsAcknowledged: boolean;
}

export interface FinalExportValidation {
  canExport: boolean;
  blockers: FinalExportBlocker[];
}

export function validateFinalExport(input: FinalExportValidationInput): FinalExportValidation {
  const blockers: FinalExportBlocker[] = [];

  if (!input.financialValidation.canFinalize) blockers.push('financial-validation');
  if (input.folioWarningCount > 0 && !input.folioWarningsAcknowledged) {
    blockers.push('folio-warnings-not-acknowledged');
  }

  return { canExport: blockers.length === 0, blockers };
}
