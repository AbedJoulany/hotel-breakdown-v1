import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildHebrewWorkbook, buildUsdWorkbook } from './excelBuilders';
import type { CanonicalExportModel, CanonicalNight, CanonicalRoomChargeRow } from '../../domain/export/models';

function charge(id: string, rate: string | null = '100', complete = true): CanonicalRoomChargeRow {
  return {
    groupedRowId: id,
    groupingKey: { reportDate: '2026-10-24', bookedRoomType: 'STR', occupancyCategory: 'double-child', rateKey: rate === null ? 'missing' : `numeric:${rate}`, currency: 'ILS' },
    reportDate: '2026-10-24', bookedRoomType: 'STR', adults: 2, children: 1, occupancyCategory: 'double-child', roomCount: 2, nights: 1,
    rate: rate === null ? { kind: 'missing' } : { kind: 'numeric', value: rate }, currency: 'ILS', pricingStatus: complete ? 'resolved' : 'missing-price',
    dataCompleteness: complete ? 'complete' : 'incomplete', financialCompleteness: complete ? 'complete' : 'incomplete', issues: complete ? [] : [{ code: 'missing-price', severity: 'final-blocker', affects: 'financial', message: 'Missing', sourceFactIds: [] }], sourceRefs: [],
  };
}

function night(date: string, count: number, complete = true): CanonicalNight {
  return {
    reportDate: date as CanonicalNight['reportDate'], dataCompleteness: complete ? 'complete' : 'incomplete', financialCompleteness: complete ? 'complete' : 'incomplete',
    roomCharges: Array.from({ length: count }, (_, index) => {
      const row = charge(`${date}-${index}`, '100', complete);
      return { ...row, reportDate: date as CanonicalRoomChargeRow['reportDate'], groupingKey: { ...row.groupingKey, reportDate: date as CanonicalRoomChargeRow['reportDate'] } };
    }),
  };
}

function model(nights: CanonicalNight[]): CanonicalExportModel {
  return {
    metadata: { hotelName: null, groupName: 'Group A', checkInDate: '2026-10-24', checkOutDate: '2026-10-24', reportDates: nights.map((item) => item.reportDate), currencies: ['ILS'] },
    warnings: [], nights,
  };
}

const usdModel: CanonicalExportModel = {
  metadata: { hotelName: null, groupName: 'Group A', checkInDate: '2026-10-24', checkOutDate: '2026-10-24', reportDates: ['2026-10-24'], currencies: ['ILS'] },
  warnings: [],
  nights: [{
    reportDate: '2026-10-24', dataCompleteness: 'complete', financialCompleteness: 'complete',
    roomCharges: [{
      groupedRowId: 'row-1', groupingKey: { reportDate: '2026-10-24', bookedRoomType: 'STR', occupancyCategory: 'double-child', rateKey: 'numeric:100', currency: 'ILS' },
      reportDate: '2026-10-24', bookedRoomType: 'STR', adults: 2, children: 1, occupancyCategory: 'double-child', roomCount: 2, nights: 1,
      rate: { kind: 'numeric', value: '100' }, currency: 'ILS', pricingStatus: 'resolved', dataCompleteness: 'complete', financialCompleteness: 'complete', issues: [], sourceRefs: [],
    }],
  }],
};

describe('Excel builders', () => {
  it('renders one Hebrew section with the original three-row layout', async () => {
    const sheet = (await buildHebrewWorkbook(model([night('2026-10-24', 3)]))).worksheets[0];

    expect(sheet.getCell('B15').value).toContain('2026-10-24');
    expect(sheet.getCell('B16').value).toBe('הרכב');
    expect(sheet.getCell('F17').value).toMatchObject({ formula: expect.stringContaining('D17*C17*E17') });
    expect(sheet.getCell('F20').value).toMatchObject({ formula: expect.stringContaining('F17:F19') });
    expect(sheet.getCell('F21').value).toMatchObject({ formula: expect.stringContaining('F20*1.18') });
    expect(sheet.getCell('B15').isMerged).toBe(true);
    expect(sheet.getCell('B20').isMerged).toBe(true);
    expect(sheet.getCell('B21').isMerged).toBe(true);
    expect(sheet.getCell('F23').value).toMatchObject({ formula: expect.stringContaining('F21') });
    expect(sheet.getCell('B25').value).toBe('צוות וחופשיים');
    expect(sheet.getCell('B29').value).toBe('עלויות נלוות');
    expect(sheet.getCell('F31').value).toMatchObject({ formula: expect.stringContaining('F30*1.18') });
    expect(sheet.getCell('F33').value).toMatchObject({ formula: expect.stringContaining('F23+F27+F31') });
    expect(sheet.pageSetup.printArea).toBe('A3:G44');
  });

  it('renders two sections and combines all VAT-inclusive totals', async () => {
    const sheet = (await buildHebrewWorkbook(model([night('2026-10-24', 3), night('2026-10-25', 3)]))).worksheets[0];

    expect(sheet.getCell('B23').value).toContain('2026-10-25');
    expect(sheet.getCell('F28').value).toMatchObject({ formula: expect.stringContaining('F25:F27') });
    expect(sheet.getCell('F29').value).toMatchObject({ formula: expect.stringContaining('F28*1.18') });
    expect(sheet.getCell('F31').value).toMatchObject({ formula: expect.stringContaining('F21') });
    expect(sheet.getCell('F31').value).toMatchObject({ formula: expect.stringContaining('F29') });
    expect(sheet.getCell('B33').value).toBe('צוות וחופשיים');
    expect(sheet.getCell('B37').value).toBe('עלויות נלוות');
    expect(sheet.getCell('F39').value).toMatchObject({ formula: expect.stringContaining('F38*1.18') });
    expect(sheet.getCell('F41').value).toMatchObject({ formula: expect.stringContaining('F31+F35+F39') });
    expect(sheet.getCell('A51').value).toContain('ישרוטל');
    expect(sheet.pageSetup.printArea).toBe('A3:G52');
  });

  it('moves later sections when a section has more than three detail rows', async () => {
    const sheet = (await buildHebrewWorkbook(model([night('2026-10-24', 4), night('2026-10-25', 1)]))).worksheets[0];

    expect(sheet.getCell('F21').value).toMatchObject({ formula: expect.stringContaining('F17:F20') });
    expect(sheet.getCell('F22').value).toMatchObject({ formula: expect.stringContaining('F21*1.18') });
    expect(sheet.getCell('B24').value).toContain('2026-10-25');
    expect(sheet.getCell('F27').value).toMatchObject({ formula: expect.stringContaining('F26:F26') });
    expect(sheet.getCell('F28').value).toMatchObject({ formula: expect.stringContaining('F27*1.18') });
    expect(sheet.getCell('F30').value).toMatchObject({ formula: expect.stringContaining('F22') });
    expect(sheet.getCell('F30').value).toMatchObject({ formula: expect.stringContaining('F28') });
  });

  it.each([0, 1, 2, 3, 4])('supports %i Hebrew room sections without stale references', async (sectionCount) => {
    const nights = Array.from({ length: sectionCount }, (_, index) => night(`2026-10-${String(24 + index).padStart(2, '0')}`, 1));
    const sheet = (await buildHebrewWorkbook(model(nights))).worksheets[0];
    const combinedRow = sectionCount === 0 ? 15 : 15 + sectionCount * 6;
    const combined = sheet.getCell(`F${combinedRow}`);

    expect(sheet.getImages()).toHaveLength(1);
    expect(combined.value).toBeDefined();
    if (sectionCount === 0) expect(combined.value).toMatchObject({ formula: '=""' });
    if (sectionCount > 0) expect(combined.value).toMatchObject({ formula: expect.stringContaining(`F${15 + (sectionCount - 1) * 6 + 4}`) });
    expect(sheet.pageSetup.printArea).toMatch(/^A3:G\d+$/);
  });

  it('preserves blank propagation for missing and incomplete prices', async () => {
    const missing = night('2026-10-24', 1);
    missing.roomCharges = [charge('missing', null, false)];
    const sheet = (await buildHebrewWorkbook(model([missing]))).worksheets[0];

    expect(sheet.getCell('F17').value).toEqual({ formula: '=""' });
    expect(sheet.getCell('F18').value).toMatchObject({ formula: expect.stringContaining('F17:F17') });
    expect(sheet.getCell('F19').value).toMatchObject({ formula: expect.stringContaining('F18*1.18') });
  });

  it('preserves Hebrew RTL, one worksheet, logo, formats, and serialization', async () => {
    const workbook = await buildHebrewWorkbook(model([night('2026-10-24', 3)]));
    const sheet = workbook.worksheets[0];
    expect(workbook.worksheets).toHaveLength(1);
    expect(sheet.name).toBe('גיליון');
    expect(sheet.views[0].rightToLeft).toBe(true);
    expect(sheet.views[0].showGridLines).toBe(true);
    expect(sheet.views[0].zoomScale).toBe(124);
    expect(sheet.getImages()).toHaveLength(1);
    const imageRange = sheet.getImages()[0].range;
    expect(imageRange.tl.nativeCol).toBe(2);
    expect(imageRange.tl.nativeRow).toBe(1);
    expect(imageRange.tl.nativeColOff).toBe(83005);
    expect(imageRange.tl.nativeRowOff).toBe(156604);
    expect(imageRange.br.nativeCol).toBe(4);
    expect(imageRange.br.nativeRow).toBe(8);
    expect(imageRange.br.nativeColOff).toBe(304765);
    expect(imageRange.br.nativeRowOff).toBe(32404);
    expect((sheet.getCell('B15').fill as ExcelJS.FillPattern).fgColor?.argb).toBe('FFC0C0C0');
    expect((sheet.getCell('B15').fill as ExcelJS.FillPattern).bgColor?.argb).toBe('FFCCCCFF');
    expect((sheet.getCell('B16').fill as ExcelJS.FillPattern).fgColor?.argb).toBe('FFFF8080');
    expect((sheet.getCell('B16').fill as ExcelJS.FillPattern).bgColor?.argb).toBe('FFFF99CC');
    expect((sheet.getCell('B20').fill as ExcelJS.FillPattern).fgColor?.argb).toBe('FFFF99CC');
    expect((sheet.getCell('B20').fill as ExcelJS.FillPattern).bgColor?.argb).toBe('FFFF8080');
    expect((sheet.getCell('F21').fill as ExcelJS.FillPattern).fgColor?.argb).toBe('FFFF8080');
    expect((sheet.getCell('F23').fill as ExcelJS.FillPattern).fgColor?.argb).toBe('FFFFFF00');
    expect(sheet.getCell('C10').isMerged).toBe(true);
    expect(sheet.getCell('B15').isMerged).toBe(true);
    expect(sheet.getColumn(1).width).toBe(12.7109375);
    expect(sheet.getColumn(2).width).toBe(35.140625);
    expect(sheet.getColumn(3).width).toBe(14);
    expect(sheet.getColumn(4).width).toBe(7.140625);
    expect(sheet.getColumn(5).width).toBe(6.28515625);
    expect(sheet.getColumn(6).width).toBe(22.140625);
    expect(sheet.getColumn(7).width).toBe(9);
    expect(sheet.properties.defaultRowHeight).toBe(12.75);
    expect(sheet.getRow(15).height).toBe(15.75);
    expect(sheet.getRow(16).height).toBe(15);
    expect(sheet.getRow(17).height).toBe(15);
    expect(sheet.getRow(20).height).toBe(15);
    expect(sheet.getRow(21).height).toBe(15);
    expect(sheet.getCell('C17').numFmt).toBe('"₪ "#,##0');
    expect(sheet.getCell('F17').numFmt).toBe('"₪ "#,##0');
    expect(sheet.getCell('D17').numFmt).toBeUndefined();
    expect(sheet.getCell('E17').numFmt).toBeUndefined();
    expect(sheet.getCell('B17').alignment.readingOrder).toBe('rtl');
    expect(sheet.getCell('B20').alignment.readingOrder).toBe('rtl');
    expect(sheet.getCell('B17').border.top?.style).toBe('medium');
    expect(sheet.getCell('B17').border.bottom?.style).toBe('medium');
    expect(sheet.getCell('B16').border.bottom?.style).toBeUndefined();
    expect(sheet.getCell('B21').border.left?.style).toBe('medium');
    expect(sheet.getCell('F21').border.right?.style).toBe('medium');
    expect(sheet.getCell('F23').border.left?.style).toBeUndefined();
    expect(sheet.pageSetup.orientation).toBe('portrait');
    expect(sheet.pageSetup.paperSize).toBe(9);
    expect(sheet.pageSetup.scale).toBe(90);
    expect(sheet.pageSetup.fitToPage).toBe(false);
    expect(sheet.pageSetup.fitToWidth).toBe(1);
    expect(sheet.pageSetup.fitToHeight).toBe(1);
    expect(sheet.pageSetup.horizontalDpi).toBe(300);
    expect(sheet.pageSetup.verticalDpi).toBe(300);
    expect(sheet.pageSetup.margins?.left).toBe(0.329861111111111);
    expect(sheet.pageSetup.margins?.right).toBe(0.479861111111111);
    expect(sheet.pageSetup.printArea).toBe('A3:G44');

    const buffer = await workbook.xlsx.writeBuffer();
    const reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(buffer);
    expect(reloaded.worksheets).toHaveLength(1);
    expect(reloaded.worksheets[0].name).toBe('גיליון');
    expect(reloaded.worksheets[0].pageSetup.paperSize).toBe(9);
    expect(reloaded.worksheets[0].pageSetup.scale).toBe(90);
    expect(reloaded.worksheets[0].pageSetup.fitToPage).toBe(false);
    expect(reloaded.worksheets[0].pageSetup.fitToWidth).toBe(1);
    expect(reloaded.worksheets[0].pageSetup.fitToHeight).toBe(1);
    expect(reloaded.worksheets[0].pageSetup.horizontalDpi).toBe(300);
    expect(reloaded.worksheets[0].pageSetup.verticalDpi).toBe(300);
    expect(reloaded.worksheets[0].pageSetup.printArea).toBe('A3:G44');
    expect(reloaded.worksheets[0].pageSetup.margins?.left).toBe(0.329861111111111);
    expect(reloaded.worksheets[0].getImages()[0]!.range.tl.nativeCol).toBe(2);
    expect(reloaded.worksheets[0].getImages()[0]!.range.tl.nativeColOff).toBe(83005);
    expect(reloaded.worksheets[0].getCell('F21').value).toMatchObject({ formula: expect.stringContaining('F20*1.18') });
  });

  it('matches the original Hebrew header fields and merges without overlap', async () => {
    const sheet = (await buildHebrewWorkbook(model([night('2026-10-24', 3)]))).worksheets[0];

    expect(sheet.getCell('B2').value).toBeNull();
    expect(sheet.getCell('B3').value).toBeNull();
    expect(sheet.getCell('B4').value).toBe('תאריך הוצאת המסמך');
    expect(sheet.getCell('F4').value).toBe('לידי');
    expect(sheet.getCell('B10').value).toBe('שם הקבוצה');
    expect(sheet.getCell('C10').value).toBe('Group A');
    expect(sheet.getCell('B11').value).toBe('מלון מארח');
    expect(sheet.getCell('C11').value).toBe('');
    expect(sheet.getCell('B12').value).toBe('תאריך אירוח');
    expect(sheet.getCell('C12').value).toBe('2026-10-24');
    expect(sheet.getCell('B13').value).toBe('הזמנה ');
    expect(sheet.getCell('C13').value).toBe('');
    expect(sheet.getCell('B15').value).toContain('פירוט עלויות');

    expect(sheet.getCell('C9').isMerged).toBe(true);
    expect(sheet.getCell('C10').isMerged).toBe(true);
    expect(sheet.getCell('C11').isMerged).toBe(true);
    expect(sheet.getCell('C12').isMerged).toBe(true);
    expect(sheet.getCell('C13').isMerged).toBe(true);
    expect(sheet.getCell('B2').isMerged).toBe(false);
    expect(sheet.getCell('B3').isMerged).toBe(false);
    expect(sheet.getRow(4).height).toBe(15);
    expect(sheet.getRow(5).height).toBe(18);
    expect(sheet.getRow(9).height).toBe(18);
    expect(sheet.getRow(10).height).toBe(20.25);
    expect(sheet.getRow(11).height).toBe(18);
    expect(sheet.getRow(12).height).toBe(18);
    expect(sheet.getRow(13).height).toBe(18);
    expect(sheet.getRow(14).height).toBe(15);
    expect(sheet.getCell('B10').alignment.horizontal).toBe('right');
    expect(sheet.getCell('C9').alignment.readingOrder).toBe('rtl');
    expect((sheet.getCell('B10').fill as ExcelJS.FillPattern).fgColor?.argb).toBe('FFFF8080');
    expect(sheet.getCell('B10').font.size).toBe(12);
    expect(sheet.getCell('C10').font.size).toBe(16);
    expect(sheet.getCell('B13').border.bottom?.style).toBe('medium');
  });

  it('renders the complete original geometry for the top header boxes', async () => {
    const sheet = (await buildHebrewWorkbook(model([night('2026-10-24', 3)]))).worksheets[0];
    const border = (address: string) => sheet.getCell(address).border;

    expect(border('B4').top?.style).toBe('medium');
    expect(border('B4').bottom?.style).toBe('thin');
    expect(border('B4').left?.style).toBe('medium');
    expect(border('B4').right?.style).toBe('medium');
    expect(border('F4').top?.style).toBe('medium');
    expect(border('F4').bottom?.style).toBe('thin');
    expect(border('F4').left?.style).toBe('medium');
    expect(border('F4').right?.style).toBe('medium');
    expect(border('B5').top?.style).toBe('thin');
    expect(border('B5').bottom?.style).toBe('medium');
    expect(border('B5').left?.style).toBe('medium');
    expect(border('B5').right?.style).toBe('medium');
    expect(border('F5').top?.style).toBeUndefined();
    expect(border('F5').bottom?.style).toBe('medium');
    expect(border('F5').left?.style).toBe('medium');
    expect(border('F5').right?.style).toBe('medium');
    expect(sheet.getCell('C5').border?.top?.style).toBeUndefined();
    expect(sheet.getCell('C5').border?.bottom?.style).toBeUndefined();
  });

  it('keeps English ILS export consistent', async () => {
    const workbook = await buildUsdWorkbook(usdModel, 'ILS');
    const sheet = workbook.worksheets[0];
    expect(workbook.worksheets).toHaveLength(1);
    expect(sheet.getCell('D12').value).toBe(100);
    expect(sheet.getCell('F12').value).toMatchObject({ formula: expect.stringContaining('ISNUMBER(D12)') });
    expect(sheet.views[0].rightToLeft).toBe(false);
    expect(sheet.getImages()).toHaveLength(1);
  });

  it('supports the English USD choice separately', async () => {
    const usdFixture: CanonicalExportModel = {
      ...usdModel,
      metadata: { ...usdModel.metadata, currencies: ['USD'] },
      nights: usdModel.nights.map((night) => ({
        ...night,
        roomCharges: night.roomCharges.map((row) => ({
          ...row,
          currency: 'USD',
          groupingKey: { ...row.groupingKey, currency: 'USD' },
        })),
      })),
    };
    const sheet = (await buildUsdWorkbook(usdFixture)).worksheets[0];
    expect(sheet.getCell('C7').value).toBe('USD');
    expect(sheet.getCell('D12').value).toBe(100);
    expect(sheet.getCell('D12').numFmt).toContain('$');
  });

  it('adds Additional Charges sections to Hebrew and USD exports', async () => {
    const additionalCharges = [{
      id: 'charge-1', description: 'Breakfast', price: { kind: 'numeric' as const, value: '25' },
      quantity: { kind: 'numeric' as const, value: '2' }, number: { kind: 'numeric' as const, value: '1' },
      currency: 'ILS' as const, financialCompleteness: 'complete' as const, issues: [],
    }];
    const hebrew = await buildHebrewWorkbook({ ...model([night('2026-10-24', 1)]), additionalCharges });
    const hebrewSheet = hebrew.worksheets[0];
    expect(hebrewSheet.getCell('B27').value).toBe('עלויות נלוות');
    expect(hebrewSheet.getCell('B28').value).toBe('Breakfast');
    expect(hebrewSheet.getCell('F28').value).toMatchObject({ formula: expect.stringContaining('C28*D28*E28') });
    expect(hebrewSheet.getCell('F30').value).toMatchObject({ formula: expect.stringContaining('F29*1.18') });
    expect(hebrewSheet.pageSetup.printArea).toBe('A3:G43');

    const usd = await buildUsdWorkbook({ ...usdModel, additionalCharges: [{ ...additionalCharges[0], currency: 'ILS' }] }, 'ILS');
    const usdSheet = usd.worksheets[0];
    expect(usdSheet.getCell('B20').value).toBe('Additional Charges');
    expect(usdSheet.getCell('F22').value).toMatchObject({ formula: expect.stringContaining('C22*D22*E22') });
  });

  it('exports Free & Staff rows separately without VAT or room-total inclusion', async () => {
    const complimentaryStaff = [{
      id: 'free-1', type: 'free' as const, amount: { kind: 'numeric' as const, value: '30' },
      number: { kind: 'numeric' as const, value: '2' }, currency: 'ILS' as const, completeness: 'complete' as const, issues: [],
    }];
    const hebrew = await buildHebrewWorkbook({ ...model([night('2026-10-24', 1)]), complimentaryStaff });
    const hebrewSheet = hebrew.worksheets[0];
    expect(hebrewSheet.getCell('B23').value).toBe('צוות וחופשיים');
    expect(hebrewSheet.getCell('B24').value).toBe('חופשי');
    expect(hebrewSheet.getCell('C24').value).toBe(30);
    expect(hebrewSheet.getCell('D24').value).toBe(2);
    expect(hebrewSheet.getCell('E24').value).toBe(1);
    expect(hebrewSheet.getCell('F24').value).toMatchObject({ formula: expect.stringContaining('C24*D24*E24') });
    expect(hebrewSheet.getCell('F25').value).toMatchObject({ formula: expect.stringContaining('F24:F24') });
    expect(hebrewSheet.getCell('F26').value).toMatchObject({ formula: expect.stringContaining('F25*1.18') });
    expect(hebrewSheet.getCell('B28').value).toBe('עלויות נלוות');

    const usd = await buildUsdWorkbook({ ...usdModel, complimentaryStaff: [{ ...complimentaryStaff[0], currency: 'ILS' }] }, 'ILS');
    const usdSheet = usd.worksheets[0];
    expect(usdSheet.getCell('B20').value).toBe('Free & Staff');
    expect(usdSheet.getCell('F22').value).toMatchObject({ formula: expect.stringContaining('C22*D22') });
  });

  it('renders empty staff and extras sections without placeholder detail rows', async () => {
    const sheet = (await buildHebrewWorkbook(model([night('2026-10-24', 3)]))).worksheets[0];

    expect(sheet.getCell('B25').value).toBe('צוות וחופשיים');
    expect(sheet.getCell('B25').value).toBe('צוות וחופשיים');
    expect(sheet.getCell('B26').value).toBe('סה"כ צוות וחופשיים לא כולל מע"מ');
    expect(sheet.getCell('F26').value).toEqual({ formula: '=""' });
    expect(sheet.getCell('B29').value).toBe('עלויות נלוות');
    expect(sheet.getCell('B30').value).toBe('סה"כ לאקסטרות לא כולל מע"מ');
    expect(sheet.getCell('F30').value).toEqual({ formula: '=""' });
    expect(sheet.getCell('F31').value).toMatchObject({ formula: expect.stringContaining('F30*1.18') });
    expect(sheet.getCell('F33').value).toMatchObject({ formula: expect.stringContaining('F23+F27+F31') });
    expect(sheet.getCell('F34').value).toBeNull();
    expect(sheet.getCell('F35').value).toMatchObject({ formula: expect.stringContaining('F33-F34') });
    expect(sheet.pageSetup.printArea).toBe('A3:G44');
  });

  it('renders exactly the supplied staff and extras rows and keeps Notes within column F', async () => {
    const complimentaryStaff = [{
      id: 'staff-1', type: 'staff' as const, amount: { kind: 'numeric' as const, value: '30' },
      number: { kind: 'numeric' as const, value: '2' }, currency: 'ILS' as const, completeness: 'complete' as const, issues: [],
    }];
    const additionalCharges = [1, 2].map((index) => ({
      id: `extra-${index}`, description: `Extra ${index}`, price: { kind: 'numeric' as const, value: String(index * 10) },
      quantity: { kind: 'numeric' as const, value: '1' }, number: { kind: 'numeric' as const, value: '1' },
      currency: 'ILS' as const, financialCompleteness: 'complete' as const, issues: [],
    }));
    const sheet = (await buildHebrewWorkbook({ ...model([night('2026-10-24', 3), night('2026-10-25', 3)]), complimentaryStaff, additionalCharges })).worksheets[0];

    expect(sheet.getCell('B34').value).toBe('צוות');
    expect(sheet.getCell('B35').value).toBe('סה"כ צוות וחופשיים לא כולל מע"מ');
    expect(sheet.getCell('B38').value).toBe('עלויות נלוות');
    expect(sheet.getCell('B39').value).toBe('Extra 1');
    expect(sheet.getCell('B40').value).toBe('Extra 2');
    expect(sheet.getCell('B41').value).toBe('סה"כ לאקסטרות לא כולל מע"מ');
    expect(sheet.getCell('F42').value).toMatchObject({ formula: expect.stringContaining('F41*1.18') });
    expect(sheet.getCell('F44').value).toMatchObject({ formula: expect.stringContaining('F31+F36+F42') });
    expect(sheet.getCell('F46').value).toMatchObject({ formula: expect.stringContaining('F44-F45') });
    expect(sheet.model.merges).toContain('A48:F48');
    expect(sheet.model.merges).toContain('A54:G54');
    expect(sheet.getCell('B47').border.top?.style).toBe('medium');
    expect(sheet.getCell('F47').border.right?.style).toBe('medium');
    expect(sheet.pageSetup.printArea).toBe('A3:G55');

    const roundTrip = new ExcelJS.Workbook();
    await roundTrip.xlsx.load(await (await buildHebrewWorkbook({ ...model([night('2026-10-24', 3), night('2026-10-25', 3)]), complimentaryStaff, additionalCharges })).xlsx.writeBuffer());
    expect(roundTrip.worksheets[0].model.merges).toContain('A48:F48');
    expect(roundTrip.worksheets[0].getCell('F46').value).toMatchObject({ formula: expect.stringContaining('F44-F45') });
  });

  it('expands staff and extras beyond the original template capacity', async () => {
    const complimentaryStaff = Array.from({ length: 3 }, (_, index) => ({
      id: `staff-${index}`, type: 'staff' as const, amount: { kind: 'numeric' as const, value: String(10 + index) },
      number: { kind: 'numeric' as const, value: '1' }, currency: 'ILS' as const, completeness: 'complete' as const, issues: [],
    }));
    const additionalCharges = Array.from({ length: 8 }, (_, index) => ({
      id: `extra-${index}`, description: `Extra ${index}`, price: { kind: 'numeric' as const, value: '10' },
      quantity: { kind: 'numeric' as const, value: '1' }, number: { kind: 'numeric' as const, value: '1' },
      currency: 'ILS' as const, financialCompleteness: 'complete' as const, issues: [],
    }));
    const sheet = (await buildHebrewWorkbook({ ...model([night('2026-10-24', 3)]), complimentaryStaff, additionalCharges })).worksheets[0];

    expect(sheet.getCell('B26').value).toBe('צוות');
    expect(sheet.getCell('B33').value).toBe('Extra 0');
    expect(sheet.getCell('F41').value).toMatchObject({ formula: expect.stringContaining('F33:F40') });
    expect(sheet.getCell('F42').value).toMatchObject({ formula: expect.stringContaining('F41*1.18') });
    expect(sheet.getCell('F44').value).toMatchObject({ formula: expect.stringContaining('F23+F30+F42') });
    expect(sheet.getCell('F46').value).toMatchObject({ formula: expect.stringContaining('F44-F45') });
    expect(sheet.getCell('A54').value).toContain('ישרוטל');
  });
});
