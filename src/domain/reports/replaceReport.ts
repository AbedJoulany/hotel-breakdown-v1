import type { IsoDate } from '../shared/types';
import type { ActiveReportDocument, ReportCandidate } from './models';

export type ReportReplacementResult =
  | { kind: 'ignored-invalid'; reports: ActiveReportDocument[] }
  | { kind: 'ignored-duplicate'; reports: ActiveReportDocument[] }
  | { kind: 'added'; reports: ActiveReportDocument[] }
  | { kind: 'replaced'; reports: ActiveReportDocument[] };

export function replaceReportForDate(
  reports: ActiveReportDocument[],
  candidate: ReportCandidate,
): ReportReplacementResult {
  if (!candidate.isValid) {
    return { kind: 'ignored-invalid', reports };
  }

  const existingIndex = reports.findIndex(
    (report) => report.reportDate === candidate.reportDate,
  );

  if (existingIndex === -1) {
    return {
      kind: 'added',
      reports: sortReports([...reports, withoutValidationFlag(candidate)]),
    };
  }

  const existing = reports[existingIndex];
  if (existing.contentHash === candidate.contentHash) {
    return { kind: 'ignored-duplicate', reports };
  }

  const nextReports = [...reports];
  nextReports[existingIndex] = withoutValidationFlag(candidate);
  return { kind: 'replaced', reports: sortReports(nextReports) };
}

function withoutValidationFlag(candidate: ReportCandidate): ActiveReportDocument {
  const { isValid: _isValid, ...activeReport } = candidate;
  return activeReport;
}

function sortReports(reports: ActiveReportDocument[]): ActiveReportDocument[] {
  return [...reports].sort((a, b) => a.reportDate.localeCompare(b.reportDate));
}

export function hasReportForDate(
  reports: ActiveReportDocument[],
  reportDate: IsoDate,
): boolean {
  return reports.some((report) => report.reportDate === reportDate);
}

