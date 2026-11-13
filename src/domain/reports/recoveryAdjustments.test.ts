import { describe, expect, it } from 'vitest';
import { applyRecoveryAdjustments, type RecoveryAdjustment } from './recoveryAdjustments';
import type { ActiveReportDocument, RoomRecord } from './models';

const room = (roomNumber: string, reportedRate: string | null): RoomRecord => ({
  roomNumber,
  guestName: `Guest ${roomNumber}`,
  reservationNumber: null,
  bookedRoomType: 'STR',
  actualRoomType: 'STR',
  blockCode: null,
  fromDate: '2026-10-31',
  toDate: '2026-11-03',
  adults: 1,
  children: 0,
  babies: 0,
  rooms: 1,
  rateCode: null,
  reportedRate,
});

const report: ActiveReportDocument = {
  id: 'report-1',
  reportDate: '2026-10-31',
  originalFileName: 'group-report.pdf',
  contentHash: 'hash-1',
  groupSnapshots: [{
    reportId: 'group-1',
    reportDate: '2026-10-31',
    groupName: 'Alaska Chamber',
    rooms: [room('0825', '1030')],
  }],
};

const adjustment = (overrides: Partial<RecoveryAdjustment> = {}): RecoveryAdjustment => ({
  id: 'recovery-1',
  targetDate: '2026-11-01',
  sourceDate: '2026-10-31',
  groupName: 'Alaska Chamber',
  room: room('0826', '1030'),
  proposedRate: '1030',
  approvedRate: '1030',
  included: true,
  status: 'approved',
  origin: 'previous-night-copy',
  createdAt: '2026-11-06T00:00:00.000Z',
  ...overrides,
});

describe('applyRecoveryAdjustments', () => {
  it('adds only approved included rooms while preserving original reports', () => {
    const original = structuredClone(report);
    const effective = applyRecoveryAdjustments([report], [
      adjustment(),
      adjustment({ id: 'recovery-excluded', room: room('0827', '1030'), included: false }),
      adjustment({ id: 'recovery-proposed', room: room('0828', '1030'), status: 'proposed', approvedRate: null }),
    ]);

    expect(report).toEqual(original);
    expect(effective).toHaveLength(2);
    expect(effective[1].groupSnapshots[0].rooms.map((entry) => entry.roomNumber)).toEqual(['0826']);
    expect(effective[1].groupSnapshots[0].rooms[0].reportedRate).toBe('1030');
  });

  it('does not duplicate an approved room/date entry', () => {
    const effective = applyRecoveryAdjustments([report], [adjustment(), adjustment({ id: 'recovery-duplicate' })]);

    expect(effective[1].groupSnapshots[0].rooms).toHaveLength(1);
  });
});
