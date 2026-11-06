import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { extractPdfTextPages } from './pdfTextExtractor';

describe('extractPdfTextPages', () => {
  it('extracts positioned text from the 24 October group report', async () => {
    const pdf = await readFile('group in ils/24.10.26.pdf');
    const pages = await extractPdfTextPages(pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength));
    const allText = pages.flatMap((page) => page.items.map((item) => item.text)).join(' ');

    expect(pages).toHaveLength(2);
    expect(allText).toContain('101 Groups IH by room (with rate)');
    expect(allText).toContain('Etgar-Nof');
    expect(allText).toContain('0524');
    expect(pages[0].items.some((item) => item.x > 0 && item.y > 0)).toBe(true);
  });
});
