import { exportTargetCurrency, type CanonicalExportModel, type ExportIssue, type ExportLanguage } from './models';

export interface ExportValidation {
  canDraft: boolean;
  canFinal: boolean;
  issues: ExportIssue[];
  finalBlockers: ExportIssue[];
}

export function validateExport(model: CanonicalExportModel, language: ExportLanguage = 'usd', folioComparisonComplete = true): ExportValidation {
  const targetCurrency = exportTargetCurrency(language);
  const currencyIssues: ExportIssue[] = [
    ...model.nights.flatMap((night) => night.roomCharges
      .filter((row) => row.currency !== null && row.currency !== targetCurrency)
      .map((row) => ({
        code: 'currency-mismatch', severity: 'warning' as const, affects: 'presentation' as const,
        message: `${row.currency} room charge cannot be represented in the selected ${targetCurrency} template`,
        sourceFactIds: row.sourceRefs.map((ref) => ref.factId),
      }))),
    ...(model.additionalCharges ?? [])
      .filter((row) => row.currency !== targetCurrency)
      .map((row) => ({
        code: 'currency-mismatch', severity: 'warning' as const, affects: 'presentation' as const,
        message: `${row.currency} additional charge cannot be represented in the selected ${targetCurrency} template`,
        sourceFactIds: [],
      })),
    ...(model.complimentaryStaff ?? [])
      .filter((row) => row.currency !== targetCurrency)
      .map((row) => ({
        code: 'currency-mismatch', severity: 'warning' as const, affects: 'presentation' as const,
        message: `${row.currency} Free/Staff line cannot be represented in the selected ${targetCurrency} template`,
        sourceFactIds: [],
      })),
  ];
  const issues = [
    ...model.warnings,
    ...currencyIssues,
    ...(folioComparisonComplete ? [] : [{
      code: 'folio-comparison-required', severity: 'warning' as const, affects: 'presentation' as const,
      message: 'Complete Folio Comparison before exporting.', sourceFactIds: [],
    }]),
  ];
  const finalBlockers = issues.filter((issue) => issue.severity === 'final-blocker');
  return { canDraft: folioComparisonComplete, canFinal: folioComparisonComplete && finalBlockers.length === 0, issues, finalBlockers };
}
