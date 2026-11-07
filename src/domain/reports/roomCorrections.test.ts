import { describe, expect, it } from 'vitest';
import { applyRoomCorrections, type RoomCorrection } from './roomCorrections';
import type { RoomRecord } from './models';

const room = (roomNumber: string, guestName: string, rooms: number): RoomRecord => ({
  roomNumber,
  guestName,
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

const correction = (selectedRecordIndex: number): RoomCorrection => ({
  id: `correction-${selectedRecordIndex}`,
  reportId: 'report-1',
  reportDate: '2026-10-25',
  groupName: 'Example Group',
  roomNumber: '0526',
  selectedRecordIndex,
  reason: 'Manual review',
  correctedAt: '2026-11-06T00:00:00.000Z',
});

describe('applyRoomCorrections', () => {
  it('keeps the selected record and removes the unselected duplicate', () => {
    const rooms = [room('0526', 'Guest A', 1), room('0526', 'Guest B', 2), room('0527', 'Guest C', 1)];

    expect(applyRoomCorrections(rooms, [correction(1)])).toEqual([rooms[1], rooms[2]]);
    expect(rooms).toHaveLength(3);
  });

  it('keeps unrelated rooms unchanged', () => {
    const rooms = [room('0526', 'Guest A', 1), room('0526', 'Guest B', 2), room('0527', 'Guest C', 1)];

    expect(applyRoomCorrections(rooms, [correction(0)])).toEqual([rooms[0], rooms[2]]);
  });

  it('rejects a correction whose source index does not contain the stated room', () => {
    const rooms = [room('0526', 'Guest A', 1), room('0527', 'Guest B', 1)];

    expect(() => applyRoomCorrections(rooms, [correction(1)])).toThrow(
      'Room correction does not match source record: 0526',
    );
  });

  it('rejects more than one correction for the same room', () => {
    const rooms = [room('0526', 'Guest A', 1), room('0526', 'Guest B', 2)];

    expect(() => applyRoomCorrections(rooms, [correction(0), correction(1)])).toThrow(
      'Multiple corrections found for room: 0526',
    );
  });
});
