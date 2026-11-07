import { describe, expect, it } from 'vitest';
import { normalizeGroupReportRow, normalizeReportDate } from './normalizeGroupReportRow';

describe('normalizeGroupReportRow', () => {
  it('maps Upg to booked room type and Rm to actual room type', () => {
    const room = normalizeGroupReportRow({
      room: '0524',
      guest: 'Sarira Batiya',
      reservationNumber: '161538479',
      rm: 'FAP',
      upg: 'STR',
      blockCode: '2610ETGARN',
      fromDate: '24-OCT-26',
      toDate: '26-OCT-26',
      adults: '3',
      children: '0',
      babies: '0',
      rooms: '1',
      rateCode: 'ETGRBB',
      rate: '2020',
    });

    expect(room).toEqual({
      roomNumber: '0524',
      guestName: 'Sarira Batiya',
      reservationNumber: '161538479',
      bookedRoomType: 'STR',
      actualRoomType: 'FAP',
      blockCode: '2610ETGARN',
      fromDate: '2026-10-24',
      toDate: '2026-10-26',
      adults: 3,
      children: 0,
      babies: 0,
      rooms: 1,
      rateCode: 'ETGRBB',
      reportedRate: '2020',
    });
  });

  it('keeps blank occupancy values unknown', () => {
    const room = normalizeGroupReportRow({
      room: '0444',
      guest: 'Lubin Levitt Sharyn',
      adults: '',
      children: ' ',
      babies: undefined,
      rooms: '1',
    });

    expect(room.adults).toBeNull();
    expect(room.children).toBeNull();
    expect(room.babies).toBeNull();
    expect(room.rooms).toBe(1);
  });

  it('normalizes two-digit and four-digit report years', () => {
    expect(normalizeReportDate('25-OCT-26')).toBe('2026-10-25');
    expect(normalizeReportDate('25-OCT-2026')).toBe('2026-10-25');
    expect(normalizeReportDate('')).toBeNull();
  });

  it('rejects malformed dates and non-numeric counts', () => {
    expect(() => normalizeReportDate('2026/10/25')).toThrow('Unsupported report date');
    expect(() => normalizeGroupReportRow({ room: '0105', guest: 'Guest', adults: 'unknown' })).toThrow(
      'Invalid integer report value',
    );
  });
});
