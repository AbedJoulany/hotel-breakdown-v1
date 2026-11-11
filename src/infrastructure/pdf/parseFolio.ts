import type { FolioEntry } from '../../domain/folio/models';
import type { SupportedCurrency } from '../../domain/pricing/pricingRules';
import type { IsoDate } from '../../domain/shared/types';
import type { PdfTextItem, PdfTextPage } from './pdfTextExtractor';

export interface ParsedFolio {
  entries: FolioEntry[];
  currency: SupportedCurrency;
  totals: Record<SupportedCurrency, string | null>;
  confirmationNumber: string | null;
}

export function parseFolio(pages: PdfTextPage[]): ParsedFolio {
  const currency = findCurrency(pages);
  return {
    currency,
    entries: pages.flatMap((page) => parsePageEntries(page, currency)),
    totals: findTotals(pages),
    confirmationNumber: findConfirmationNumber(pages),
  };
}

function findConfirmationNumber(pages: PdfTextPage[]): string | null {
  for (const page of pages) {
    const label = page.items.find((item) => /confirmation\s*(number|no\.?)/iu.test(item.text.trim()));
    if (!label) continue;
    const candidates = page.items
      .filter((item) => Math.abs(item.y - label.y) <= 4 && item.x > label.x)
      .sort((left, right) => left.x - right.x)
      .flatMap((item) => item.text.trim().split(/\s+/u))
      .map((value) => value.replace(/^[#:\-]+|[.,;]+$/gu, ''))
      .filter((value) => /^[A-Za-z0-9][A-Za-z0-9/_-]*$/u.test(value));
    if (candidates[0]) return candidates[0];
  }
  return null;
}

function parsePageEntries(page: PdfTextPage, currency: SupportedCurrency): FolioEntry[] {
  const accountRoomNumber = findAccountRoomNumber(page);
  const dateItems = page.items
    .filter((item) => item.x < 55 && parseFolioDate(item.text) !== null)
    .sort((left, right) => left.y - right.y);

  return dateItems.flatMap((dateItem) => {
    const rowItems = page.items.filter((item) => item.y >= dateItem.y - 1 && item.y <= dateItem.y + 2);
    const description = rowItems
      .filter((item) => item.x >= 55 && item.x < 300)
      .sort((left, right) => left.x - right.x)
      .find((item) => /^\d{4}\s+\S/u.test(item.text.trim()))?.text.trim() ?? '';
    const match = /^(\d{4})\s+(.+)$/u.exec(description);
    if (!match || match[1] === accountRoomNumber) return [];

    const charges = findAmount(rowItems, 300, 395);
    const credits = findAmount(rowItems, 395, 480);
    if (charges === null && credits === null) return [];

    return [{
      roomNumber: match[1],
      guestName: match[2].trim(),
      transactionDate: parseFolioDate(dateItem.text) as IsoDate,
      description,
      charges,
      credits,
      nights: null,
      currency,
    }];
  });
}

function findAmount(items: PdfTextItem[], minX: number, maxX: number): string | null {
  return items
    .filter((item) => item.x >= minX && item.x < maxX)
    .map((item) => item.text.trim())
    .find((text) => /^-?[\d,]+\.\d{2}$/u.test(text)) ?? null;
}

function findCurrency(pages: PdfTextPage[]): SupportedCurrency {
  const currency = pages.flatMap((page) => page.items).find((item) => /^(NIS|ILS|USD)$/u.test(item.text.trim()))?.text.trim();
  if (currency === 'NIS' || currency === 'ILS') return 'ILS';
  if (currency === 'USD') return 'USD';
  throw new Error('Folio currency was not found');
}

function findTotals(pages: PdfTextPage[]): Record<SupportedCurrency, string | null> {
  return {
    ILS: findFooterCurrencyAmount(pages, ['NIS', 'ILS'], 250, 395),
    USD: findFooterCurrencyAmount(pages, ['USD'], 395, 530),
  };
}

function findFooterCurrencyAmount(
  pages: PdfTextPage[],
  labels: string[],
  minX: number,
  maxX: number,
): string | null {
  const candidates = pages.flatMap((page) => page.items
    .filter((item) => item.y > 320 && labels.includes(item.text.trim()))
    .map((currencyItem) => ({
      y: currencyItem.y,
      amount: findAmount(
        page.items.filter((item) => Math.abs(item.y - currencyItem.y) <= 3),
        minX,
        maxX,
      ),
    })))
    .filter((candidate): candidate is { y: number; amount: string } => candidate.amount !== null)
    .sort((left, right) => right.y - left.y);

  return candidates[0]?.amount ?? null;
}

function findAccountRoomNumber(page: PdfTextPage): string | null {
  const roomLabel = page.items.find((item) => item.text.trim() === 'Room No.');
  if (!roomLabel) return null;
  const value = page.items
    .filter((item) => Math.abs(item.y - roomLabel.y) <= 4 && item.x > 440)
    .map((item) => item.text.trim())
    .find((text) => /^\d{4}\b/u.test(text));
  return value?.slice(0, 4) ?? null;
}

function parseFolioDate(value: string): IsoDate | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/u.exec(value.trim());
  if (!match) return null;
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` as IsoDate;
}
