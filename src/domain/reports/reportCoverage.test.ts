import { describe, expect, it } from 'vitest';
import { findMissingReportDates, summarizeReportCoverage } from './reportCoverage';
import type { ActiveReportDocument } from './models';

const report = (reportDate: ActiveReportDocument['reportDate']): ActiveReportDocument => ({
  id: reportDate,
  reportDate,
  originalFileName: `${reportDate}.pdf`,
  contentHash: reportDate,
  groupSnapshots: [],
});

describe('summarizeReportCoverage', () => {
  it('finds missing dates between active reports', () => {
    expect(summarizeReportCoverage([
      report('2026-10-24'),
      report('2026-10-26'),
    ])).toEqual({
      start: '2026-10-24',
      end: '2026-10-26',
      reportDates: ['2026-10-24', '2026-10-26'],
      missingDates: ['2026-10-25'],
    });
  });

  it('returns null when no reports are active', () => {
    expect(summarizeReportCoverage([])).toBeNull();
  });

  it('finds missing dates in a user-selected range', () => {
    expect(findMissingReportDates(
      ['2026-10-24', '2026-10-26'],
      '2026-10-24',
      '2026-10-27',
    )).toEqual(['2026-10-25', '2026-10-27']);
  });
});

