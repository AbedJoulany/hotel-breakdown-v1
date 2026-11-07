import type { ActiveReportDocument, DailyGroupSnapshot } from './models';
import { summarizeRoomOccupancy } from './roomOccupancy';
import { groupMatchKey } from './groupMatch';
import type { IsoDate } from '../shared/types';

export interface DailyRoomNightSummary {
  reportDate: IsoDate;
  occupiedRoomNumbers: string[];
  roomNights: number;
}

export interface GroupRoomNightSummary {
  groupName: string;
  days: DailyRoomNightSummary[];
  totalRoomNights: number;
}

export function calculateGroupRoomNights(
  reports: ActiveReportDocument[],
  groupName: string,
): GroupRoomNightSummary {
  const days = reports
    .flatMap((report) => {
      const selectedGroupKey = groupMatchKey(groupName);
      const group = report.groupSnapshots.find((snapshot) => groupMatchKey(snapshot.groupName) === selectedGroupKey);
      return group ? [summarizeGroupDay(report.reportDate, group)] : [];
    })
    .sort((a, b) => a.reportDate.localeCompare(b.reportDate));

  return {
    groupName,
    days,
    totalRoomNights: days.reduce((total, day) => total + day.roomNights, 0),
  };
}

function summarizeGroupDay(
  reportDate: IsoDate,
  group: DailyGroupSnapshot,
): DailyRoomNightSummary {
  const occupancy = summarizeRoomOccupancy(group.rooms);
  return {
    reportDate,
    occupiedRoomNumbers: occupancy.occupiedRoomNumbers,
    roomNights: occupancy.occupiedRoomCount,
  };
}
