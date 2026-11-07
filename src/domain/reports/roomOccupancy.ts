import type { RoomRecord } from './models';

const CONFLICT_FIELDS = [
  'bookedRoomType',
  'actualRoomType',
  'blockCode',
  'fromDate',
  'toDate',
  'adults',
  'children',
  'babies',
  'rooms',
  'rateCode',
  'reportedRate',
] as const;

export type ConflictField = (typeof CONFLICT_FIELDS)[number];

export interface RoomOccupancySummary {
  occupiedRoomCount: number;
  occupiedRoomNumbers: string[];
  duplicateRoomNumbers: string[];
}

export interface RoomConflict {
  roomNumber: string;
  recordIndexes: number[];
  conflictingFields: ConflictField[];
}

export function summarizeRoomOccupancy(rooms: RoomRecord[]): RoomOccupancySummary {
  const occupiedRoomNumbers = unique(
    rooms
      .filter((room) => room.rooms !== null && room.rooms > 0)
      .map((room) => room.roomNumber),
  );

  const duplicateRoomNumbers = unique(
    rooms
      .map((room) => room.roomNumber)
      .filter((roomNumber, index, all) => all.indexOf(roomNumber) !== index),
  );

  return {
    occupiedRoomCount: occupiedRoomNumbers.length,
    occupiedRoomNumbers,
    duplicateRoomNumbers,
  };
}

export function findRoomConflicts(rooms: RoomRecord[]): RoomConflict[] {
  const conflicts: RoomConflict[] = [];
  const byRoom = new Map<string, Array<{ room: RoomRecord; index: number }>>();

  rooms.forEach((room, index) => {
    const records = byRoom.get(room.roomNumber) ?? [];
    records.push({ room, index });
    byRoom.set(room.roomNumber, records);
  });

  for (const [roomNumber, records] of byRoom) {
    if (records.length < 2) {
      continue;
    }

    const conflictingFields = CONFLICT_FIELDS.filter((field) => {
      const values = records.map(({ room }) => room[field]);
      return values.some((value) => value !== values[0]);
    });

    if (conflictingFields.length > 0) {
      conflicts.push({
        roomNumber,
        recordIndexes: records.map(({ index }) => index),
        conflictingFields: [...conflictingFields],
      });
    }
  }

  return conflicts;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
