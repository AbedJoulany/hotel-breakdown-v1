import type { ExportLanguage } from '../export/models';
import type { CanonicalExportModel, CanonicalRoomChargeRow } from '../export/models';
import type { SupportedCurrency } from './pricingRules';

export interface FinancialRowResult {
  groupedRowId: string;
  amount: string | null;
}

export interface FinancialPreview {
  rows: FinancialRowResult[];
  additionalRows: FinancialRowResult[];
  complimentaryStaffRows: FinancialRowResult[];
  nightlyTotals: Record<string, Record<SupportedCurrency, string | null>>;
  totals: Record<SupportedCurrency, string | null>;
}

export function calculateFinancialPreview(model: CanonicalExportModel, language: ExportLanguage): FinancialPreview {
  const rows: FinancialRowResult[] = [];
  const nightlyTotals: Record<string, Record<SupportedCurrency, string | null>> = {};
  const totals: Record<SupportedCurrency, string | null> = { ILS: '0', USD: '0' };

  for (const night of model.nights) {
    const nightIncomplete = night.financialCompleteness === 'incomplete';
    const nightValues: Record<SupportedCurrency, string | null> = { ILS: nightIncomplete ? null : '0', USD: nightIncomplete ? null : '0' };
    for (const row of night.roomCharges) {
      const amount = row.financialCompleteness === 'complete' && row.currency && row.rate.kind === 'numeric'
        ? multiplyDecimal(row.rate.value, row.roomCount * row.nights, language === 'hebrew' && row.currency === 'ILS' ? '1.18' : '1')
        : null;
      rows.push({ groupedRowId: row.groupedRowId, amount });
      if (amount !== null && nightValues[row.currency!] !== null) {
        nightValues[row.currency!] = addDecimal(nightValues[row.currency!]!, amount);
      }
    }
    nightlyTotals[night.reportDate] = nightValues;
    for (const currency of ['ILS', 'USD'] as const) {
      if (nightValues[currency] === null) totals[currency] = null;
      else if (totals[currency] !== null) totals[currency] = addDecimal(totals[currency]!, nightValues[currency]!);
    }
  }

  const additionalRows = (model.additionalCharges ?? []).map((row) => {
    const amount = row.financialCompleteness === 'complete' && row.currency === (language === 'hebrew' ? 'ILS' : 'USD')
      && row.price.kind === 'numeric' && row.quantity.kind === 'numeric' && row.number.kind === 'numeric'
      ? multiplyDecimal(row.price.value, Number(row.quantity.value) * Number(row.number.value), language === 'hebrew' && row.currency === 'ILS' ? '1.18' : '1')
      : null;
    if (row.currency === (language === 'hebrew' ? 'ILS' : 'USD')) {
      if (amount === null) totals[row.currency] = null;
      else if (totals[row.currency] !== null) totals[row.currency] = addDecimal(totals[row.currency]!, amount);
    }
    return { groupedRowId: `additional:${row.id}`, amount };
  });

  const complimentaryStaffRows = (model.complimentaryStaff ?? []).map((row) => {
    const amount = row.completeness === 'complete' && row.currency === (language === 'hebrew' ? 'ILS' : 'USD')
      && row.amount.kind === 'numeric' && row.number.kind === 'numeric'
      ? multiplyDecimal(row.amount.value, Number(row.number.value), language === 'hebrew' && row.currency === 'ILS' ? '1.18' : '1')
      : null;
    if (row.currency === (language === 'hebrew' ? 'ILS' : 'USD')) {
      if (amount === null) totals[row.currency] = null;
      else if (totals[row.currency] !== null) totals[row.currency] = addDecimal(totals[row.currency]!, amount);
    }
    return { groupedRowId: `complimentary-staff:${row.id}`, amount };
  });

  return {
    rows,
    additionalRows,
    complimentaryStaffRows,
    nightlyTotals,
    totals: {
      ILS: totals.ILS === null ? null : roundFinal(totals.ILS),
      USD: totals.USD === null ? null : roundFinal(totals.USD),
    },
  };
}

function multiplyDecimal(value: string, multiplier: number, factor: string): string {
  const parsed = parseDecimal(value);
  const parsedFactor = parseDecimal(factor);
  return formatDecimal(parsed.unscaled * BigInt(multiplier) * parsedFactor.unscaled, parsed.scale + parsedFactor.scale);
}

function addDecimal(left: string, right: string): string {
  const a = parseDecimal(left);
  const b = parseDecimal(right);
  const scale = Math.max(a.scale, b.scale);
  const leftValue = a.unscaled * 10n ** BigInt(scale - a.scale);
  const rightValue = b.unscaled * 10n ** BigInt(scale - b.scale);
  return formatDecimal(leftValue + rightValue, scale);
}

function roundFinal(value: string): string {
  const parsed = parseDecimal(value);
  if (parsed.scale <= 2) return formatDecimal(parsed.unscaled * 10n ** BigInt(2 - parsed.scale), 2);
  const divisor = 10n ** BigInt(parsed.scale - 2);
  let rounded = parsed.unscaled / divisor;
  const remainder = parsed.unscaled % divisor;
  const absoluteRemainder = remainder < 0n ? -remainder : remainder;
  if (absoluteRemainder * 2n >= divisor) rounded += parsed.unscaled < 0n ? -1n : 1n;
  return formatDecimal(rounded, 2);
}

function parseDecimal(value: string): { unscaled: bigint; scale: number } {
  const normalized = value.trim().replace(/^\+/u, '');
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole, fraction = ''] = unsigned.split('.');
  const unscaled = BigInt(`${whole || '0'}${fraction}` || '0');
  return { unscaled: negative ? -unscaled : unscaled, scale: fraction.length };
}

function formatDecimal(unscaled: bigint, scale: number): string {
  const negative = unscaled < 0n;
  const digits = (negative ? -unscaled : unscaled).toString().padStart(scale + 1, '0');
  if (scale === 0) return `${negative ? '-' : ''}${digits}`;
  const whole = digits.slice(0, -scale) || '0';
  const fraction = digits.slice(-scale).replace(/0+$/u, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}
