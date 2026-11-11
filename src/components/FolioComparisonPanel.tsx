import { useMemo, useState } from 'react';
import { summarizeFolioStayComparison } from '../domain/folio/compareFolio';
import type { FolioStayComparisonResult, GroupRoomForFolioComparison } from '../domain/folio/models';
import type { FolioWarningAcknowledgement } from '../infrastructure/storage/workspaceStore';
import { hashArrayBuffer } from '../infrastructure/files/hashArrayBuffer';
import { extractPdfTextPages } from '../infrastructure/pdf/pdfTextExtractor';
import { parseFolio, type ParsedFolio } from '../infrastructure/pdf/parseFolio';

interface FolioComparisonPanelProps {
  groupRooms: GroupRoomForFolioComparison[];
  warningAcknowledgement: FolioWarningAcknowledgement | null;
  onFolioLoaded: (fileHash: string | null) => void;
  onConfirmationNumberDetected: (confirmationNumber: string | null) => void;
  onWarningAcknowledged: () => void;
}

function FolioComparisonPanel({
  groupRooms,
  warningAcknowledgement,
  onFolioLoaded,
  onConfirmationNumberDetected,
  onWarningAcknowledged,
}: FolioComparisonPanelProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [folio, setFolio] = useState<ParsedFolio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const comparison = useMemo(() => folio
    ? summarizeFolioStayComparison(groupRooms, folio.entries, folio.currency)
    : [], [folio, groupRooms]);

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const data = await file.arrayBuffer();
      const pages = await extractPdfTextPages(data);
      const nextFileHash = await hashArrayBuffer(data);
      const parsedFolio = parseFolio(pages);
      setFolio(parsedFolio);
      setFileName(file.name);
      setFileHash(nextFileHash);
      onFolioLoaded(nextFileHash);
      onConfirmationNumberDetected(parsedFolio.confirmationNumber);
    } catch {
      setFolio(null);
      setFileName(null);
      setFileHash(null);
      onFolioLoaded(null);
      onConfirmationNumberDetected(null);
      setError('Could not analyze this Folio PDF.');
    }
  }

  const warningCount = comparison.filter((result) => result.status !== 'matched').length;
  const warningsAcknowledged = Boolean(
    fileHash && warningAcknowledgement?.folioFileHash === fileHash,
  );

  return (
    <section className="folio-panel" aria-labelledby="folio-panel-title">
      <div className="folio-panel-heading">
        <div>
          <p className="eyebrow">Optional comparison</p>
          <h3 id="folio-panel-title">Folio Comparison</h3>
        </div>
        {fileName && <span className="file-name" aria-live="polite">Selected: {fileName}</span>}
      </div>
      <label className="upload-box folio-upload-box">
        <span className="upload-box-title">Upload Folio PDF</span>
        <span className="upload-box-hint">Choose one Folio PDF to compare with the selected group.</span>
        <input
          aria-label="Folio PDF"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => void handleUpload(event.target.files?.[0])}
        />
      </label>
      {error && <p className="error-message" role="alert">{error}</p>}
      {folio && (
        <>
          <div className="folio-totals" aria-label="Folio totals">
            <span><strong>ILS</strong> {folio.totals.ILS ?? '—'}</span>
            <span><strong>USD</strong> {folio.totals.USD ?? '—'}</span>
          </div>
          <p className="muted folio-review-note">
            Stay totals are aggregated by room and guest across all selected report dates. Comparison is for review only.
          </p>
          {warningCount > 0 && (
            <div className={`folio-acknowledgement${warningsAcknowledged ? ' acknowledged' : ''}`}>
              <strong>{warningCount} Folio warning(s) require review.</strong>
              <label>
                <input
                  type="checkbox"
                  checked={warningsAcknowledged}
                  onChange={(event) => {
                    if (event.target.checked) onWarningAcknowledged();
                  }}
                />
                I reviewed the Folio warnings.
              </label>
              <span role="status">
                {warningsAcknowledged
                  ? 'Warnings acknowledged for this Folio file.'
                  : 'Final export would require this acknowledgment.'}
              </span>
            </div>
          )}
          {groupRooms.length === 0 ? (
            <p className="muted">Select a group to compare its rooms.</p>
          ) : (
            <div className="folio-comparison-list">
              <strong>Room comparison</strong>
              <div className="folio-comparison-header" aria-hidden="true">
                <span>Room / Guest · All dates</span>
                <span>Group nights</span>
                <span>Folio nights</span>
                <span>Folio entries</span>
                <span>Group amount</span>
                <span>Folio amount</span>
                <span>Status</span>
              </div>
              {comparison.map((result) => (
                <FolioComparisonRow key={`${result.roomNumber}-${result.guestName}`} result={result} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function FolioComparisonRow({ result }: { result: FolioStayComparisonResult }) {
  const statusText = {
    matched: 'Matched',
    'amount-mismatch': 'Warning: amount mismatch',
    'missing-in-folio': 'Missing in Folio',
    'missing-in-group': 'Missing in Group Report',
    'data-missing': 'Data missing',
  }[result.status];

  return (
    <div className={`folio-comparison-row ${result.status}`}>
      <span>{result.roomNumber} · {result.guestName || 'Unnamed guest'}</span>
      <span>{result.groupNightCount}</span>
      <span>{result.folioNightCount ?? 'Not stated'}</span>
      <span>{result.folioEntryCount}</span>
      <span>{result.groupAmount ?? '—'}</span>
      <span>{result.folioAmount ?? '—'}</span>
      <strong>{statusText}</strong>
    </div>
  );
}

export default FolioComparisonPanel;
