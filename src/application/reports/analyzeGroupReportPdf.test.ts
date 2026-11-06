import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { analyzeGroupReportPdf } from './analyzeGroupReportPdf';

describe('analyzeGroupReportPdf', () => {
  it('composes extraction, parsing, occupancy, and conflict detection', async () => {
    const pdf = await readFile('group in ils/25.10.26.pdf');
    const report = await analyzeGroupReportPdf(
      pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength),
    );
    const goldfarb = report.groups.find((group) => group.groupName.startsWith('Goldfarb'));

    expect(report.reportDate).toBe('2026-10-25');
    expect(report.groups).toHaveLength(6);
    expect(goldfarb?.occupancy.occupiedRoomCount).toBe(52);
    expect(goldfarb?.conflicts).toEqual([
      {
        roomNumber: '0526',
        recordIndexes: [41, 42],
        conflictingFields: ['adults', 'rooms'],
      },
    ]);
  });
});
