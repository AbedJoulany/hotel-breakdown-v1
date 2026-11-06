import { describe, expect, it } from 'vitest';
import { findRoomConflicts, summarizeRoomOccupancy } from './roomOccupancy';
import type { RoomRecord } from './models';

const room = (roomNumber: string, rooms: number | null): RoomRecord => ({
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
  rooms,
  rateCode: null,
  reportedRate: null,
});

describe('summarizeRoomOccupancy', () => {
  it('counts a shared or duplicated room once', () => {
    const summary = summarizeRoomOccupancy([
      room('0526', 1),
      room('0526', 0),
      room('0527', 1),
    ]);

    expect(summary.occupiedRoomCount).toBe(2);
    expect(summary.occupiedRoomNumbers).toEqual(['0526', '0527']);
    expect(summary.duplicateRoomNumbers).toEqual(['0526']);
  });

  it('does not count unknown occupancy as occupied', () => {
    const summary = summarizeRoomOccupancy([room('0105', null), room('0106', 1)]);

    expect(summary.occupiedRoomCount).toBe(1);
    expect(summary.duplicateRoomNumbers).toEqual([]);
  });

  it('flags conflicting room values without treating different guest names alone as a conflict', () => {
    const first = room('0526', 1);
    const second = { ...room('0526', 0), guestName: 'Another Guest' };

    expect(findRoomConflicts([first, second])).toEqual([
      {
        roomNumber: '0526',
        recordIndexes: [0, 1],
        conflictingFields: ['rooms'],
      },
    ]);
  });
});

