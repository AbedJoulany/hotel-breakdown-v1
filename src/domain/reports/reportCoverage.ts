import type { ActiveReportDocument } from './models';
import type { IsoDate } from '../shared/types';

export interface ReportCoverage {
  start: IsoDate;
  end: IsoDate;
  reportDates: IsoDate[];
  missingDates: IsoDate[];
}

export function summarizeReportCoverage(
  reports: ActiveReportDocument[],
): ReportCoverage | null {
  if (reports.length === 0) {
    return null;
  }

  const reportDates = [...new Set(reports.map((report) => report.reportDate))].sort();
  const start = reportDates[0];
  const end = reportDates[reportDates.length - 1];
  const knownDates = new Set(reportDates);
  const missingDates: IsoDate[] = [];

  for (
    let cursor = toUtcDate(start);
    cursor <= toUtcDate(end);
    cursor = addUtcDays(cursor, 1)
  ) {
    const date = formatIsoDate(cursor);
    if (!knownDates.has(date)) {
      missingDates.push(date);
    }
  }

  return { start, end, reportDates, missingDates };
}

export function findMissingReportDates(
  reportDates: IsoDate[],
  start: IsoDate,
  end: IsoDate,
): IsoDate[] {
  if (start > end) {
    return [];
  }

  const knownDates = new Set(reportDates);
  const missingDates: IsoDate[] = [];
  for (
    let cursor = toUtcDate(start);
    cursor <= toUtcDate(end);
    cursor = addUtcDays(cursor, 1)
  ) {
    const date = formatIsoDate(cursor);
    if (!knownDates.has(date)) {
      missingDates.push(date);
    }
  }

  return missingDates;
}

function toUtcDate(value: IsoDate): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function addUtcDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatIsoDate(value: Date): IsoDate {
  return value.toISOString().slice(0, 10) as IsoDate;
}
