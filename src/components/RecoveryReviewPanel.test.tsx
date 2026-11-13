import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RecoveryReviewPanel from './RecoveryReviewPanel';
import type { RecoveryAdjustment } from '../domain/reports/recoveryAdjustments';
import type { RoomRecord } from '../domain/reports/models';

const room: RoomRecord = {
  roomNumber: '0825',
  guestName: 'McDonnell Laura Ann Martinson',
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
  reportedRate: '1030',
};

const candidate = { targetDate: '2026-11-02' as const, sourceDate: '2026-11-01' as const, rooms: [room] };

const proposed = (overrides: Partial<RecoveryAdjustment> = {}): RecoveryAdjustment => ({
  id: 'recovery-1',
  targetDate: candidate.targetDate,
  sourceDate: candidate.sourceDate,
  groupName: 'Alaska Chamber',
  room,
  proposedRate: '1030',
  approvedRate: null,
  currency: 'ILS',
  included: true,
  status: 'proposed',
  origin: 'previous-night-copy',
  createdAt: '2026-11-06T00:00:00.000Z',
  ...overrides,
});

describe('RecoveryReviewPanel', () => {
  it('creates a proposal, allows exclusion and rate editing, then approves it', () => {
    const onCreateProposal = vi.fn();
    const onUpdateAdjustment = vi.fn();
    const onApprove = vi.fn();
    const onCancel = vi.fn();

    const { rerender } = render(
      <RecoveryReviewPanel
        candidates={[candidate]}
        adjustments={[]}
        onCreateProposal={onCreateProposal}
        onUpdateAdjustment={onUpdateAdjustment}
        onApprove={onApprove}
        onCancel={onCancel}
        onEdit={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Recover Missing Night' }));
    expect(onCreateProposal).toHaveBeenCalledWith(candidate);

    rerender(
      <RecoveryReviewPanel
        candidates={[candidate]}
        adjustments={[proposed()]}
        onCreateProposal={onCreateProposal}
        onUpdateAdjustment={onUpdateAdjustment}
        onApprove={onApprove}
        onCancel={onCancel}
        onEdit={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Include room 0825' }));
    expect(onUpdateAdjustment).toHaveBeenCalledWith('recovery-1', { included: false });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Recovery rate 0825' }), { target: { value: '1100' } });
    expect(onUpdateAdjustment).toHaveBeenCalledWith('recovery-1', expect.objectContaining({ proposedRate: '1100' }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve recovery' }));
    expect(onApprove).toHaveBeenCalledWith('2026-11-02');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledWith('2026-11-02');
  });
});
