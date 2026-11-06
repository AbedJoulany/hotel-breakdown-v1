import { describe, expect, it } from 'vitest';
import { calculateGroupRoomNights } from './roomNights';
import type { ActiveReportDocument, RoomRecord } from './models';

const room = (roomNumber: string): RoomRecord => ({
  roomNumber,
  guestName: 'Guest',
  reservationNumber: null,
  bookedRoomType: null,
  actualRoomType: null,
  blockCode: null,
  fromDate: null,
  toDate: null,
  adults: null,
  children: null,
  babies: null,
  rooms: 1,
  rateCode: null,
  reportedRate: null,
});

const report = (date: ActiveReportDocument['reportDate'], rooms: RoomRecord[]): ActiveReportDocument => ({
  id: date,
  reportDate: date,
  originalFileName: `${date}.pdf`,
  contentHash: date,
  groupSnapshots: [{
    reportId: date,
    reportDate: date,
    groupName: 'Etgar-Nof Va Yam',
    rooms,
  }],
});

describe('calculateGroupRoomNights', () => {
  it('sums unique occupied rooms across report dates', () => {
    expect(calculateGroupRoomNights([
      report('2026-10-25', [room('0105'), room('0107')]),
      report('2026-10-24', [room('0105')]),
    ], 'Etgar-Nof Va Yam')).toEqual({
      groupName: 'Etgar-Nof Va Yam',
      days: [
        { reportDate: '2026-10-24', occupiedRoomNumbers: ['0105'], roomNights: 1 },
        { reportDate: '2026-10-25', occupiedRoomNumbers: ['0105', '0107'], roomNights: 2 },
      ],
      totalRoomNights: 3,
    });
  });

  it('returns an empty summary when the group is absent', () => {
    expect(calculateGroupRoomNights([], 'Unknown')).toEqual({
      groupName: 'Unknown',
      days: [],
      totalRoomNights: 0,
    });
  });
});

