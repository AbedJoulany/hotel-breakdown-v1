import type { Id, IsoDate } from '../shared/types';
import type { RoomRecord } from './models';

export interface RoomCorrection {
  id: Id;
  reportId: Id;
  reportDate: IsoDate;
  groupName: string;
  roomNumber: string;
  selectedRecordIndex: number;
  reason: string | null;
  correctedAt: string;
}

export function applyRoomCorrections(
  rooms: RoomRecord[],
  corrections: RoomCorrection[],
): RoomRecord[] {
  const selectedIndexesByRoom = new Map<string, number>();

  for (const correction of corrections) {
    const selectedRoom = rooms[correction.selectedRecordIndex];
    if (!selectedRoom || selectedRoom.roomNumber !== correction.roomNumber) {
      throw new Error(`Room correction does not match source record: ${correction.roomNumber}`);
    }

    if (selectedIndexesByRoom.has(correction.roomNumber)) {
      throw new Error(`Multiple corrections found for room: ${correction.roomNumber}`);
    }

    selectedIndexesByRoom.set(correction.roomNumber, correction.selectedRecordIndex);
  }

  return rooms.filter((room, index) => {
    const selectedIndex = selectedIndexesByRoom.get(room.roomNumber);
    return selectedIndex === undefined || selectedIndex === index;
  });
}

