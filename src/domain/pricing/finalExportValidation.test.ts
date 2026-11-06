import { describe, expect, it } from 'vitest';
import { validateFinalExport } from './finalExportValidation';
import type { FinancialValidation } from './financialValidation';

const readyFinancialValidation: FinancialValidation = { canFinalize: true, issues: [] };

describe('validateFinalExport', () => {
  it('allows export when financial validation is ready and there are no Folio warnings', () => {
    expect(validateFinalExport({ financialValidation: readyFinancialValidation, folioWarningCount: 0, folioWarningsAcknowledged: false }))
      .toEqual({ canExport: true, blockers: [] });
  });

  it('blocks export until Folio warnings are acknowledged', () => {
    expect(validateFinalExport({ financialValidation: readyFinancialValidation, folioWarningCount: 2, folioWarningsAcknowledged: false }))
      .toEqual({ canExport: false, blockers: ['folio-warnings-not-acknowledged'] });
  });

  it('allows acknowledged Folio warnings but keeps financial blockers active', () => {
    expect(validateFinalExport({
      financialValidation: { canFinalize: false, issues: [{ kind: 'missing-price', count: 1 }] },
      folioWarningCount: 2,
      folioWarningsAcknowledged: true,
    })).toEqual({ canExport: false, blockers: ['financial-validation'] });
  });
});

