import { describe, expect, it } from 'vitest';
import { replaceReportForDate } from './replaceReport';
import type { ActiveReportDocument, ReportCandidate } from './models';

const baseReport = (overrides: Partial<ActiveReportDocument> = {}): ActiveReportDocument => ({
  id: 'report-1',
  reportDate: '2026-10-25',
  originalFileName: '25.10.26.pdf',
  contentHash: 'hash-a',
  groupSnapshots: [],
  ...overrides,
});

const candidate = (overrides: Partial<ReportCandidate> = {}): ReportCandidate => ({
  ...baseReport(),
  isValid: true,
  ...overrides,
});

describe('replaceReportForDate', () => {
  it('adds a valid report when no report exists for its date', () => {
    const result = replaceReportForDate([], candidate());

    expect(result.kind).toBe('added');
    expect(result.reports).toHaveLength(1);
    expect(result.reports[0]).not.toHaveProperty('isValid');
  });

  it('ignores an invalid candidate and keeps the active report', () => {
    const existing = [baseReport()];
    const result = replaceReportForDate(existing, candidate({ isValid: false }));

    expect(result.kind).toBe('ignored-invalid');
    expect(result.reports).toEqual(existing);
  });

  it('ignores an exact duplicate without retaining a duplicate record', () => {
    const existing = [baseReport()];
    const result = replaceReportForDate(existing, candidate({ id: 'report-duplicate' }));

    expect(result.kind).toBe('ignored-duplicate');
    expect(result.reports).toEqual(existing);
  });

  it('replaces a valid report with a different valid report for the same date', () => {
    const existing = [baseReport()];
    const result = replaceReportForDate(
      existing,
      candidate({ id: 'report-2', originalFileName: 'replacement.pdf', contentHash: 'hash-b' }),
    );

    expect(result.kind).toBe('replaced');
    expect(result.reports).toEqual([
      baseReport({ id: 'report-2', originalFileName: 'replacement.pdf', contentHash: 'hash-b' }),
    ]);
  });
});
