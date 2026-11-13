import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { analyzeGroupReportPdf } from '../reports/analyzeGroupReportPdf';
import { summarizeFolioStayComparison } from '../../domain/folio/compareFolio';
import { extractPdfTextPages } from '../../infrastructure/pdf/pdfTextExtractor';
import { parseFolio } from '../../infrastructure/pdf/parseFolio';

describe('Alaska Group Report and Folio comparison', () => {
  it('compares both Alaska Group Report nights with the Folio', async () => {
    const reportFiles = ['group in ils/group report 31.10.pdf', 'group in ils/group report 1.11.pdf'];
    const reports = await Promise.all(reportFiles.map(async (fileName) => {
      const pdf = await readFile(fileName);
      return analyzeGroupReportPdf(pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength));
    }));
    const folioPdf = await readFile('group in ils/alaska folio.pdf');
    const folio = parseFolio(await extractPdfTextPages(folioPdf.buffer.slice(folioPdf.byteOffset, folioPdf.byteOffset + folioPdf.byteLength)));
    const groupRooms = reports.flatMap((report) => report.groups
      .filter((group) => group.groupName === 'Alaska Chamber of Commerce,Ort,BB')
      .flatMap((group) => group.rooms.map((room) => ({
        reportDate: report.reportDate as `${number}-${number}-${number}`,
        roomNumber: room.roomNumber,
        guestName: room.guestName,
        reportedRate: room.reportedRate,
        fromDate: room.fromDate,
        toDate: room.toDate,
      }))));

    const comparison = summarizeFolioStayComparison(groupRooms, folio.entries, folio.currency);
    const room0825 = comparison.find((row) => row.roomNumber === '0825' && row.guestName === 'McDonnell Laura Ann Martinson');

    expect(groupRooms.filter((room) => room.roomNumber === '0825').map((room) => room.guestName)).toEqual([
      'McDonnell Laura Ann Martinson',
      'McDonnell Laura Ann Martinson',
    ]);
    expect(room0825).toBeDefined();
    expect(comparison.filter((row) => row.roomNumber === '0825')).toHaveLength(1);
    expect(room0825?.groupNightCount).toBe(2);
    expect(room0825?.status).toBe('incomplete-group-report');
    expect(room0825?.missingGroupReportDates).toEqual(['2026-11-02']);
  });
});
