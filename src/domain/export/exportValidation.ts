import type { CanonicalExportModel, ExportIssue } from './models';

export interface ExportValidation {
  canDraft: boolean;
  canFinal: boolean;
  issues: ExportIssue[];
  finalBlockers: ExportIssue[];
}

export function validateExport(model: CanonicalExportModel): ExportValidation {
  const issues = model.warnings;
  const finalBlockers = issues.filter((issue) => issue.severity === 'final-blocker');
  return { canDraft: true, canFinal: finalBlockers.length === 0, issues, finalBlockers };
}
