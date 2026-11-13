import type { RoomRecord } from '../domain/reports/models';
import type { IsoDate } from '../domain/shared/types';
import type { RecoveryAdjustment } from '../domain/reports/recoveryAdjustments';

export interface RecoveryCandidate {
  targetDate: IsoDate;
  sourceDate: IsoDate | null;
  rooms: RoomRecord[];
}

interface RecoveryReviewPanelProps {
  candidates: RecoveryCandidate[];
  adjustments: RecoveryAdjustment[];
  onCreateProposal: (candidate: RecoveryCandidate) => void;
  onUpdateAdjustment: (id: string, patch: Partial<Pick<RecoveryAdjustment, 'room' | 'proposedRate' | 'included'>>) => void;
  onApprove: (targetDate: IsoDate) => void;
  onCancel: (targetDate: IsoDate) => void;
  onEdit: (targetDate: IsoDate) => void;
  onRemove: (targetDate: IsoDate) => void;
}

export default function RecoveryReviewPanel({
  candidates,
  adjustments,
  onCreateProposal,
  onUpdateAdjustment,
  onApprove,
  onCancel,
  onEdit,
  onRemove,
}: RecoveryReviewPanelProps) {
  const dates = [...new Set([
    ...candidates.map((candidate) => candidate.targetDate),
    ...adjustments.map((adjustment) => adjustment.targetDate),
  ])].sort();
  if (dates.length === 0) return null;

  return (
    <section className="recovery-panel" aria-labelledby="recovery-panel-title">
      <div className="recovery-panel-heading">
        <div>
          <p className="eyebrow">Manual recovery</p>
          <h3 id="recovery-panel-title">Missing Group Report Nights</h3>
        </div>
      </div>
      {dates.map((targetDate) => {
        const candidate = candidates.find((entry) => entry.targetDate === targetDate);
        const rows = adjustments.filter((entry) => entry.targetDate === targetDate);
        const approved = rows.length > 0 && rows.every((entry) => entry.status === 'approved');
        return (
          <article className="recovery-card" key={targetDate}>
            <div className="recovery-card-heading">
              <div>
                <strong>Missing night: {targetDate}</strong>
                {candidate?.sourceDate && <span className="muted">Source night: {candidate.sourceDate}</span>}
              </div>
              {rows.length === 0 && (
                <button
                  className="secondary-button"
                  type="button"
                  disabled={!candidate?.sourceDate || candidate.rooms.length === 0}
                  onClick={() => candidate && onCreateProposal(candidate)}
                >
                  Recover Missing Night
                </button>
              )}
              {approved && (
                <div className="recovery-card-actions">
                  <span className="recovery-approved" role="status">Approved recovery</span>
                  <button className="text-button" type="button" onClick={() => onEdit(targetDate)}>Edit recovery</button>
                  <button className="text-button" type="button" onClick={() => onRemove(targetDate)}>Remove recovery</button>
                </div>
              )}
            </div>
            {!candidate?.sourceDate && rows.length === 0 && (
              <p className="warning-text">Automatic copying is unavailable because no preceding source night was found.</p>
            )}
            {rows.length > 0 && (
              <>
                <div className="recovery-table" role="table" aria-label={`Recovery proposal for ${targetDate}`}>
                  <div className="recovery-table-row recovery-table-header" role="row">
                    <span>Include</span><span>Room</span><span>Guest</span><span>Room type</span><span>Rate</span><span>Quantity</span><span>Proposed total</span>
                  </div>
                  {rows.map((adjustment) => {
                    const rate = Number(adjustment.proposedRate);
                    const quantity = adjustment.room.rooms ?? 1;
                    const total = Number.isFinite(rate) && rate >= 0 && Number.isFinite(quantity) && quantity >= 0 ? (rate * quantity).toFixed(2) : '—';
                    const editable = adjustment.status === 'proposed';
                    return (
                      <div className="recovery-table-row" role="row" key={adjustment.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={adjustment.included}
                            disabled={!editable}
                            aria-label={`Include room ${adjustment.room.roomNumber}`}
                            onChange={(event) => onUpdateAdjustment(adjustment.id, { included: event.target.checked })}
                          />
                        </label>
                        <span>{adjustment.room.roomNumber}</span>
                        <span>{adjustment.room.guestName || 'Unnamed guest'}</span>
                        <span>{adjustment.room.bookedRoomType ?? adjustment.room.actualRoomType ?? '—'}</span>
                        <input
                          aria-label={`Recovery rate ${adjustment.room.roomNumber}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={adjustment.proposedRate ?? ''}
                          disabled={!editable}
                          onChange={(event) => onUpdateAdjustment(adjustment.id, { proposedRate: event.target.value, room: { ...adjustment.room, reportedRate: event.target.value } })}
                        />
                        <input
                          aria-label={`Recovery quantity ${adjustment.room.roomNumber}`}
                          type="number"
                          min="0"
                          step="1"
                          value={adjustment.room.rooms ?? ''}
                          disabled={!editable}
                          onChange={(event) => onUpdateAdjustment(adjustment.id, { room: { ...adjustment.room, rooms: event.target.value === '' ? null : Number(event.target.value) } })}
                        />
                        <span>{total}</span>
                      </div>
                    );
                  })}
                </div>
                {!approved && (
                  <div className="recovery-review-actions">
                    <button className="primary-button" type="button" onClick={() => onApprove(targetDate)}>Approve recovery</button>
                    <button className="text-button" type="button" onClick={() => onCancel(targetDate)}>Cancel</button>
                  </div>
                )}
              </>
            )}
          </article>
        );
      })}
    </section>
  );
}
