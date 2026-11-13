import type { ActiveReportDocument, DailyGroupSnapshot, RoomRecord } from './models';
import { groupMatchKey } from './groupMatch';
import type { IsoDate } from '../shared/types';

export type RecoveryAdjustmentStatus = 'proposed' | 'approved';

export interface RecoveryAdjustment {
  id: string;
  targetDate: IsoDate;
  sourceDate: IsoDate;
  groupName: string;
  room: RoomRecord;
  proposedRate: string | null;
  approvedRate: string | null;
  included: boolean;
  status: RecoveryAdjustmentStatus;
  origin: 'previous-night-copy';
  createdAt: string;
}

export function applyRecoveryAdjustments(
  reports: ActiveReportDocument[],
  adjustments: RecoveryAdjustment[],
): ActiveReportDocument[] {
  const effective = reports.map((report) => ({
    ...report,
    groupSnapshots: report.groupSnapshots.map((group) => ({ ...group, rooms: [...group.rooms] })),
  }));

  for (const adjustment of adjustments.filter((entry) => entry.status === 'approved' && entry.included)) {
    let report = effective.find((entry) => entry.reportDate === adjustment.targetDate);
    if (!report) {
      report = {
        id: `recovery-report-${adjustment.targetDate}-${adjustment.id}`,
        reportDate: adjustment.targetDate,
        originalFileName: 'Recovery Adjustment',
        contentHash: `recovery:${adjustment.id}`,
        groupSnapshots: [],
      };
      effective.push(report);
    }

    let group = report.groupSnapshots.find((entry) => groupMatchKey(entry.groupName) === groupMatchKey(adjustment.groupName));
    if (!group) {
      group = {
        reportId: `recovery-group-${adjustment.targetDate}-${adjustment.id}`,
        reportDate: adjustment.targetDate,
        groupName: adjustment.groupName,
        rooms: [],
      } satisfies DailyGroupSnapshot;
      report.groupSnapshots.push(group);
    }

    if (group.rooms.some((room) => room.roomNumber === adjustment.room.roomNumber)) continue;
    group.rooms.push({
      ...adjustment.room,
      reportedRate: adjustment.approvedRate,
    });
  }

  return effective.sort((left, right) => left.reportDate.localeCompare(right.reportDate));
}
