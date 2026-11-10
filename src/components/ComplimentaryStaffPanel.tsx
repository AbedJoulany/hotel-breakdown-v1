import type { ComplimentaryStaffRow } from '../domain/charges/complimentaryStaffModels';

interface ComplimentaryStaffPanelProps {
  rows: ComplimentaryStaffRow[];
  onChange: (rows: ComplimentaryStaffRow[]) => void;
}

function rowTotal(row: ComplimentaryStaffRow): number | null {
  if (row.amount.trim() === '' || row.number.trim() === '') return null;
  const amount = Number(row.amount);
  const number = Number(row.number);
  return Number.isFinite(amount) && amount >= 0 && Number.isInteger(number) && number >= 1 ? amount * number : null;
}

function formatTotal(value: number | null): string {
  return value === null ? '—' : value.toFixed(2);
}

function rowIssues(row: ComplimentaryStaffRow): string[] {
  const issues: string[] = [];
  const amount = Number(row.amount);
  const number = Number(row.number);
  if (row.amount.trim() === '') issues.push('Amount is required.');
  else if (!Number.isFinite(amount) || amount < 0) issues.push('Amount must be a valid non-negative number.');
  if (row.number.trim() === '') issues.push('Number is required.');
  else if (!Number.isInteger(number) || number < 1) issues.push('Number must be a whole number greater than 0.');
  return issues;
}

export default function ComplimentaryStaffPanel({ rows, onChange }: ComplimentaryStaffPanelProps) {
  const total = rows.reduce((sum, row) => sum + (rowTotal(row) ?? 0), 0);

  function updateRow(id: string, field: keyof Omit<ComplimentaryStaffRow, 'id'>, value: string) {
    onChange(rows.map((row) => row.id === id ? { ...row, [field]: value } : row));
  }

  function addRow() {
    onChange([...rows, { id: `complimentary-staff-${Date.now()}-${rows.length}`, type: 'free', amount: '', number: '1', currency: 'ILS' }]);
  }

  function removeRow(id: string) {
    if (rows.length === 1) return;
    onChange(rows.filter((row) => row.id !== id));
  }

  return (
    <div className="complimentary-staff-panel">
      <p className="placeholder-description">Record Free and Staff lines manually. Financial and Excel rules will be connected in a later task.</p>
      <div className="complimentary-staff-table-wrap">
        <table className="complimentary-staff-table">
          <thead>
            <tr>
              <th scope="col">Type</th>
              <th scope="col">Amount</th>
              <th scope="col">Number</th>
              <th scope="col">Total</th>
              <th scope="col">Currency</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td>
                  <label className="visually-hidden" htmlFor={`complimentary-type-${row.id}`}>Complimentary Type {index + 1}</label>
                  <select id={`complimentary-type-${row.id}`} aria-label={`Complimentary Type ${index + 1}`} value={row.type} onChange={(event) => updateRow(row.id, 'type', event.target.value)}>
                    <option value="free">Free</option>
                    <option value="staff">Staff</option>
                  </select>
                </td>
                <td>
                  <label className="visually-hidden" htmlFor={`complimentary-amount-${row.id}`}>Complimentary Amount {index + 1}</label>
                  <input id={`complimentary-amount-${row.id}`} aria-label={`Complimentary Amount ${index + 1}`} aria-invalid={rowIssues(row).some((issue) => issue.startsWith('Amount'))} type="number" min="0" step="0.01" value={row.amount} onChange={(event) => updateRow(row.id, 'amount', event.target.value)} />
                </td>
                <td>
                  <label className="visually-hidden" htmlFor={`complimentary-number-${row.id}`}>Complimentary Number {index + 1}</label>
                  <input id={`complimentary-number-${row.id}`} aria-label={`Complimentary Number ${index + 1}`} aria-invalid={rowIssues(row).some((issue) => issue.startsWith('Number'))} type="number" min="1" step="1" value={row.number} onChange={(event) => updateRow(row.id, 'number', event.target.value)} />
                </td>
                <td className="complimentary-staff-total" aria-label={`Complimentary Total ${index + 1}`}>{formatTotal(rowTotal(row))}</td>
                <td className="complimentary-staff-currency-cell">
                  <label className="visually-hidden" htmlFor={`complimentary-currency-${row.id}`}>Complimentary Currency {index + 1}</label>
                  <select id={`complimentary-currency-${row.id}`} aria-label={`Complimentary Currency ${index + 1}`} value={row.currency} onChange={(event) => updateRow(row.id, 'currency', event.target.value)}>
                    <option value="ILS">ILS</option>
                    <option value="USD">USD</option>
                  </select>
                  <button className="secondary-button complimentary-staff-delete" type="button" onClick={() => removeRow(row.id)} disabled={rows.length === 1} aria-label={`Delete row ${index + 1}`}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.flatMap(rowIssues).length > 0 && (
        <ul className="complimentary-staff-validation" role="alert" aria-label="Complimentary and staff validation">
          {[...new Set(rows.flatMap(rowIssues))].map((issue) => <li key={issue}>{issue}</li>)}
        </ul>
      )}
      <div className="complimentary-staff-actions">
        <button className="primary-button" type="button" onClick={addRow}>Add row</button>
        <strong aria-label="Complimentary and staff total">Total: {total.toFixed(2)}</strong>
      </div>
    </div>
  );
}
