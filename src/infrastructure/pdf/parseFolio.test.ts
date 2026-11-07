import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parseFolio } from './parseFolio';
import { extractPdfTextPages } from './pdfTextExtractor';

describe('parseFolio', () => {
  it('parses room transactions from the inspected Folio and excludes the account row', async () => {
    const pdf = await readFile('group in ils/by name and room number.pdf');
    const pages = await extractPdfTextPages(pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength));
    const folio = parseFolio(pages);

    expect(folio.currency).toBe('ILS');
    expect(folio.totals).toEqual({ ILS: '57,471.90', USD: null });
    expect(folio.entries).toHaveLength(24);
    expect(folio.entries[0]).toMatchObject({
      roomNumber: '0105',
      guestName: 'Eliezer Avital',
      transactionDate: '2026-10-25',
      charges: '1,880.00',
      credits: null,
      currency: 'ILS',
    });
    expect(folio.entries.at(-1)).toMatchObject({ roomNumber: '0524', charges: '4,750.00' });
    expect(folio.entries.find((entry) => entry.roomNumber === '0219')).toMatchObject({
      guestName: 'Maya Menahem',
    });
    expect(folio.entries.some((entry) => entry.guestName.includes('The amount payable'))).toBe(false);
    expect(folio.entries.some((entry) => entry.roomNumber === '9022')).toBe(false);
  });

  it('extracts both currency totals from the FIDF Folio variants', async () => {
    const without24 = await readFile('group in usd/fidf folio without 24.pdf');
    const with24 = await readFile('group in usd/fidf folio.pdf');
    const first = parseFolio(await extractPdfTextPages(without24.buffer.slice(without24.byteOffset, without24.byteOffset + without24.byteLength)));
    const second = parseFolio(await extractPdfTextPages(with24.buffer.slice(with24.byteOffset, with24.byteOffset + with24.byteLength)));

    expect(first.totals).toEqual({ ILS: '30,383.61', USD: '9,744.64' });
    expect(second.totals).toEqual({ ILS: '48,096.41', USD: '15,425.43' });
    expect(first.entries).toHaveLength(17);
    expect(second.entries).toHaveLength(18);
  });
});
