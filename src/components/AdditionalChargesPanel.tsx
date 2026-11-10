import type { AdditionalChargeRow } from '../domain/charges/models';

interface AdditionalChargesPanelProps {
  rows: AdditionalChargeRow[];
  onChange: (rows: AdditionalChargeRow[]) => void;
}

function parseNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rowTotal(row: AdditionalChargeRow): number | null {
  const price = parseNumber(row.price);
  const quantity = parseNumber(row.quantity);
  const number = parseNumber(row.number);
  if (price === null || quantity === null || number === null) return null;
  return price * quantity * number;
}

function formatTotal(value: number | null): string {
  return value === null ? '—' : value.toFixed(2);
}

export default function AdditionalChargesPanel({ rows, onChange }: AdditionalChargesPanelProps) {
  const total = rows.reduce((sum, row) => sum + (rowTotal(row) ?? 0), 0);

  function updateRow(id: string, field: keyof Omit<AdditionalChargeRow, 'id'>, value: string) {
    onChange(rows.map((row) => row.id === id ? { ...row, [field]: value } : row));
  }

  function addRow() {
    onChange([...rows, {
      id: `additional-charge-${Date.now()}-${rows.length}`,
      description: '',
      price: '',
      quantity: '1',
      number: '1',
      currency: 'ILS',
    }]);
  }

  function removeRow(id: string) {
    if (rows.length === 1) return;
    onChange(rows.filter((row) => row.id !== id));
  }

  return (
    <div className="additional-charges-panel">
      <p className="placeholder-description">Enter additional charges manually. Currency, VAT, and Excel mapping are handled in a later task.</p>
      <div className="additional-charges-table-wrap">
        <table className="additional-charges-table">
          <thead>
            <tr>
              <th scope="col">Description</th>
              <th scope="col">Price</th>
              <th scope="col">Quantity</th>
              <th scope="col">Number</th>
              <th scope="col">Currency</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td className="additional-charge-description-cell">
                  <label className="visually-hidden" htmlFor={`additional-description-${row.id}`}>Description {index + 1}</label>
                  <input id={`additional-description-${row.id}`} aria-label={`Description ${index + 1}`} value={row.description} onChange={(event) => updateRow(row.id, 'description', event.target.value)} />
                  <button className="secondary-button additional-charge-delete" type="button" onClick={() => removeRow(row.id)} disabled={rows.length === 1} aria-label={`Delete row ${index + 1}`}>Delete</button>
                </td>
                <td>
                  <label className="visually-hidden" htmlFor={`additional-price-${row.id}`}>Price {index + 1}</label>
                  <input id={`additional-price-${row.id}`} aria-label={`Price ${index + 1}`} type="number" min="0" step="0.01" value={row.price} onChange={(event) => updateRow(row.id, 'price', event.target.value)} />
                </td>
                <td>
                  <label className="visually-hidden" htmlFor={`additional-quantity-${row.id}`}>Quantity {index + 1}</label>
                  <input id={`additional-quantity-${row.id}`} aria-label={`Quantity ${index + 1}`} type="number" min="0" step="1" value={row.quantity} onChange={(event) => updateRow(row.id, 'quantity', event.target.value)} />
                </td>
                <td>
                  <label className="visually-hidden" htmlFor={`additional-number-${row.id}`}>Number {index + 1}</label>
                  <input id={`additional-number-${row.id}`} aria-label={`Number ${index + 1}`} type="number" min="0" step="1" value={row.number} onChange={(event) => updateRow(row.id, 'number', event.target.value)} />
                </td>
                <td>
                  <label className="visually-hidden" htmlFor={`additional-currency-${row.id}`}>Currency {index + 1}</label>
                  <select id={`additional-currency-${row.id}`} aria-label={`Currency ${index + 1}`} value={row.currency} onChange={(event) => updateRow(row.id, 'currency', event.target.value as AdditionalChargeRow['currency'])}>
                    <option value="ILS">ILS</option>
                    <option value="USD">USD</option>
                  </select>
                </td>
                <td className="additional-charge-total" aria-label={`Total ${index + 1}`}>{formatTotal(rowTotal(row))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="additional-charges-actions">
        <button className="primary-button" type="button" onClick={addRow}>Add row</button>
        <strong aria-label="Additional charges total">Total: {total.toFixed(2)}</strong>
      </div>
    </div>
  );
}
