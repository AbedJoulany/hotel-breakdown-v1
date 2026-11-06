import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parseGroupReport } from './parseGroupReport';
import { extractPdfTextPages } from './pdfTextExtractor';
import { findRoomConflicts, summarizeRoomOccupancy } from '../../domain/reports/roomOccupancy';

describe('parseGroupReport', () => {
  it('parses groups and room rows from the 24 October report', async () => {
    const pdf = await readFile('group in ils/24.10.26.pdf');
    const pages = await extractPdfTextPages(pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength));
    const report = parseGroupReport(pages);

    expect(report.reportDate).toBe('2026-10-24');
    expect(report.groups.map((group) => group.groupName)).toEqual([
      'Cross River Bank,JFC,BB',
      'Etgar-Nof Va Yam',
      'Fisher Flight, AY-OR,Eshet,BB',
    ]);
    expect(report.groups[0].rooms).toHaveLength(3);
    expect(report.groups[1].rooms[0]).toMatchObject({
      roomNumber: '0524',
      guestName: 'Sarira Batiya',
      bookedRoomType: 'STR',
      actualRoomType: 'FAP',
      adults: 3,
    });
    expect(report.groups[2].rooms).toHaveLength(11);
  });

  it('parses the USD FIDF report from 23 October across three pages', async () => {
    const pdf = await readFile('group in usd/fidf 23.10.pdf');
    const pages = await extractPdfTextPages(pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength));
    const report = parseGroupReport(pages);

    expect(report.reportDate).toBe('2026-10-23');
    expect(report.groups.map((group) => group.groupName)).toEqual([
      'Cross River Bank,JFC,BB',
      'FIDF young leadership,OR-RI,Eshet,BB',
      'Fisher Flight, AY-OR,Eshet,BB',
    ]);
    expect(report.groups[0].rooms).toHaveLength(4);
    expect(report.groups[1].rooms).toHaveLength(17);
    expect(report.groups[2].rooms).toHaveLength(15);
    expect(report.groups[2].rooms.at(-1)).toMatchObject({
      roomNumber: '0728',
      guestName: 'Schreiber Shayna&Brett',
      bookedRoomType: 'ZCR',
      actualRoomType: 'ZCR',
    });
  });

  it('parses the full 25 October report and merges repeated group sections', async () => {
    const pdf = await readFile('group in ils/25.10.26.pdf');
    const pages = await extractPdfTextPages(pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength));
    const report = parseGroupReport(pages);

    expect(report.reportDate).toBe('2026-10-25');
    expect(report.groups.map((group) => group.groupName)).toEqual([
      'Cross River Bank,JFC,BB',
      'Etgar-Nof Va Yam',
      'Fisher Flight, AY-OR,Eshet,BB',
      'Goldfarb Gibush Httech - G.D.',
      'Kenes Yotop- G.D',
      'Philip Moris-Arugot Habosem',
    ]);
    expect(report.groups.map((group) => group.rooms.length)).toEqual([36, 24, 1, 53, 16, 8]);
    expect(report.groups[3].rooms.filter((room) => room.roomNumber === '0526')).toHaveLength(2);
    expect(summarizeRoomOccupancy(report.groups[3].rooms)).toMatchObject({
      occupiedRoomCount: 52,
      duplicateRoomNumbers: ['0526'],
    });
    expect(findRoomConflicts(report.groups[3].rooms)).toEqual([
      {
        roomNumber: '0526',
        recordIndexes: [41, 42],
        conflictingFields: ['adults', 'rooms'],
      },
    ]);
    expect(report.groups.reduce(
      (total, group) => total + group.rooms.reduce((groupTotal, room) => groupTotal + (room.rooms ?? 0), 0),
      0,
    )).toBe(137);
  });
});
