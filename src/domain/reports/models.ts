import type { Id, IsoDate } from '../shared/types';

export interface RoomRecord {
  roomNumber: string;
  guestName: string;
  reservationNumber: string | null;
  bookedRoomType: string | null;
  actualRoomType: string | null;
  blockCode: string | null;
  fromDate: IsoDate | null;
  toDate: IsoDate | null;
  adults: number | null;
  children: number | null;
  babies: number | null;
  rooms: number | null;
  rateCode: string | null;
  reportedRate: string | null;
}

export interface DailyGroupSnapshot {
  reportId: Id;
  reportDate: IsoDate;
  groupName: string;
  rooms: RoomRecord[];
}

export interface ActiveReportDocument {
  id: Id;
  reportDate: IsoDate;
  originalFileName: string;
  contentHash: string;
  groupSnapshots: DailyGroupSnapshot[];
}

export interface ReportCandidate extends ActiveReportDocument {
  isValid: boolean;
}

