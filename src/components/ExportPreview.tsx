import type { ChangeEvent } from 'react';
import { exportTargetCurrency, type CanonicalExportModel, type CanonicalAdditionalChargeRow, type CanonicalComplimentaryStaffRow, type CanonicalRoomChargeRow } from '../domain/export/models';
import { validateExport } from '../domain/export/exportValidation';
import { calculateFinancialPreview } from '../domain/pricing/financialCalculator';
import type { ExportLanguage } from '../domain/export/models';
import { ROOM_TYPES } from '../domain/rooms/roomTypes';

interface ExportPreviewProps {
  model: CanonicalExportModel | null;
  language: ExportLanguage;
  rateOverrides: ReadonlyMap<string, string>;
  onRateChange: (groupedRowId: string, value: string) => void;
  onExport: (final: boolean) => void;
  folioComparisonComplete: boolean;
}

export default function ExportPreview({ model, language, rateOverrides, onRateChange, onExport, folioComparisonComplete }: ExportPreviewProps) {
  if (!model) {
    return <p className="muted">Select a group and upload reports before opening Export Preview.</p>;
  }

  const validation = validateExport(model, language, folioComparisonComplete);
  const financial = calculateFinancialPreview(model, language);
  const targetCurrency = exportTargetCurrency(language);
  const totals = financial.totals[targetCurrency];
  return (
    <section className="export-preview" aria-labelledby="export-preview-title">
      <div className="export-preview-heading">
        <div>
          <p className="eyebrow">Review before download</p>
          <h1 id="export-preview-title">Export Preview</h1>
          <p className="muted">Group: {model.metadata.groupName}</p>
        </div>
        <div className="export-actions">
          <button className="secondary-button" type="button" disabled={!validation.canDraft} onClick={() => onExport(false)}>Draft Export</button>
          <button className="primary-button" type="button" disabled={!validation.canFinal} onClick={() => onExport(true)}>Final Export</button>
        </div>
      </div>
      <div className={`export-validation ${validation.canFinal ? 'ready' : 'blocked'}`} role="status">
        {!folioComparisonComplete
          ? 'Complete Folio Comparison before exporting.'
          : validation.canFinal
            ? 'Ready for Final Export.'
            : `${validation.finalBlockers.length} issue(s) must be resolved before Final Export.`}
      </div>
      {validation.issues.length > 0 && (
        <ul className="export-issues" aria-label="Export issues">
          {validation.issues.map((issue, index) => <li key={`${issue.code}-${index}`}><strong>{issue.code}</strong> · {issue.message}</li>)}
        </ul>
      )}
      <div className="export-total-card">
        <span>{language === 'hebrew' ? 'סה״כ כולל מע״מ' : 'Overall total'}</span>
        <strong>{totals ?? '—'} {targetCurrency}</strong>
      </div>
      {model.nights.map((night) => (
        <section className="export-night" key={night.reportDate} aria-labelledby={`export-night-${night.reportDate}`}>
          <h2 id={`export-night-${night.reportDate}`}>Report Date: {night.reportDate}</h2>
          <div className="export-table" role="table" aria-label={`Export rows for ${night.reportDate}`}>
            <div className="export-table-row export-table-header" role="row">
              <span>Description</span><span>Rooms</span><span>Rate</span><span>Nights</span><span>Status</span><span>Total</span>
            </div>
            {night.roomCharges.map((row) => (
              <PreviewRow key={row.groupedRowId} row={row} language={language} override={rateOverrides.get(row.groupedRowId)} onRateChange={onRateChange} amount={financial.rows.find((item) => item.groupedRowId === row.groupedRowId)?.amount ?? null} />
            ))}
            <div className="export-night-total"><span>Nightly total</span><strong>{financial.nightlyTotals[night.reportDate]?.[targetCurrency] ?? '—'} {targetCurrency}</strong></div>
          </div>
        </section>
      ))}
      {(model.additionalCharges ?? []).length > 0 && (
        <section className="export-night" aria-labelledby="export-additional-charges-title">
          <h2 id="export-additional-charges-title">Additional Charges</h2>
          <div className="export-table" role="table" aria-label="Additional charges for export">
            <div className="export-table-row export-table-header additional-export-row" role="row">
              <span>Description</span><span>Price</span><span>Quantity</span><span>Number</span><span>Currency</span><span>Total</span>
            </div>
            {(model.additionalCharges ?? []).map((row) => (
              <AdditionalChargePreviewRow
                key={row.id}
                row={row}
                amount={financial.additionalRows.find((item) => item.groupedRowId === `additional:${row.id}`)?.amount ?? null}
              />
            ))}
          </div>
        </section>
      )}
      {(model.complimentaryStaff ?? []).length > 0 && (
        <section className="export-night" aria-labelledby="export-complimentary-staff-title">
          <h2 id="export-complimentary-staff-title">Complimentary &amp; Staff</h2>
          <div className="export-table" role="table" aria-label="Complimentary and staff rows for export">
            <div className="export-table-row export-table-header additional-export-row" role="row">
              <span>Type</span><span>Amount</span><span>Number</span><span>Currency</span><span>Total</span><span />
            </div>
            {(model.complimentaryStaff ?? []).map((row) => (
              <ComplimentaryStaffPreviewRow
                key={row.id}
                row={row}
                amount={financial.complimentaryStaffRows.find((item) => item.groupedRowId === `complimentary-staff:${row.id}`)?.amount ?? null}
              />
            ))}
          </div>
          <p className="export-muted-note">These lines are exported separately and are not included in room-charge totals until the financial rules are approved.</p>
        </section>
      )}
    </section>
  );
}

function AdditionalChargePreviewRow({ row, amount }: { row: CanonicalAdditionalChargeRow; amount: string | null }) {
  return (
    <div className={`export-table-row additional-export-row${row.financialCompleteness === 'incomplete' ? ' incomplete' : ''}`} role="row">
      <span>{row.description || 'Unresolved description'}</span>
      <span>{displayRate(row.price)}</span>
      <span>{displayRate(row.quantity)}</span>
      <span>{displayRate(row.number)}</span>
      <span>{row.currency}</span>
      <span>{amount ?? '—'}</span>
    </div>
  );
}

function ComplimentaryStaffPreviewRow({ row, amount }: { row: CanonicalComplimentaryStaffRow; amount: string | null }) {
  return (
    <div className={`export-table-row additional-export-row${row.completeness === 'incomplete' ? ' incomplete' : ''}`} role="row">
      <span>{row.type === 'free' ? 'Free' : 'Staff'}</span>
      <span>{displayRate(row.amount)}</span>
      <span>{displayRate(row.number)}</span>
      <span>{row.currency}</span>
      <span>{amount ?? '—'}</span>
      <span />
    </div>
  );
}

function displayRate(rate: CanonicalAdditionalChargeRow['price']): string {
  return rate.kind === 'numeric' ? rate.value : rate.kind === 'textual' ? rate.raw : '—';
}

function PreviewRow({ row, language, override, onRateChange, amount }: {
  row: CanonicalRoomChargeRow;
  language: ExportLanguage;
  override: string | undefined;
  onRateChange: (groupedRowId: string, value: string) => void;
  amount: string | null;
}) {
  const rateValue = override ?? (row.rate.kind === 'numeric' ? row.rate.value : row.rate.kind === 'textual' ? row.rate.raw : '');
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => onRateChange(row.groupedRowId, event.target.value);
  return (
    <div className={`export-table-row${row.financialCompleteness === 'incomplete' ? ' incomplete' : ''}`} role="row">
      <span>{roomTypeLabel(row.bookedRoomType, language)} · {occupancyLabel(row.occupancyCategory, language)}</span>
      <span>{row.roomCount}</span>
      <input aria-label={`Rate for ${row.groupedRowId}`} inputMode="decimal" value={rateValue} onChange={handleChange} />
      <span>{row.nights}</span>
      <span className={`export-row-status ${row.pricingStatus}`}>{row.pricingStatus}</span>
      <span>{amount ?? '—'}</span>
    </div>
  );
}

function roomTypeLabel(code: string | null, language: ExportLanguage): string {
  const roomType = code ? ROOM_TYPES.find((item) => item.code === code) : undefined;
  return roomType ? (language === 'hebrew' ? roomType.he : roomType.en) : language === 'hebrew' ? 'סוג חדר غير محسوم' : 'Unresolved room type';
}

function occupancyLabel(category: string, language: ExportLanguage): string {
  const labels: Record<string, [string, string]> = {
    single: ['יחיד', 'Single'], double: ['זוג', 'Double'], triple: ['שלושה', 'Triple'],
    'single-child': ['יחיד + ילד', 'Single + Child'], 'double-child': ['זוג + ילד', 'Double + Child'],
    'double-two-children': ['זוג + 2 ילדים', 'Double + 2 Children'], unresolved: ['תפוסה غير محسومة', 'Unresolved'],
  };
  return labels[category]?.[language === 'hebrew' ? 0 : 1] ?? category;
}
