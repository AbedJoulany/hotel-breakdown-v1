import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildHebrewWorkbook, buildUsdWorkbook } from './excelBuilders';
import type { CanonicalExportModel } from '../../domain/export/models';

const baseModel: CanonicalExportModel = {
  metadata: { hotelName: null, groupName: 'Group A', checkInDate: '2026-10-24', checkOutDate: '2026-10-24', reportDates: ['2026-10-24'], currencies: ['USD', 'ILS'] },
  warnings: [],
  nights: [{
    reportDate: '2026-10-24', dataCompleteness: 'complete', financialCompleteness: 'complete',
    roomCharges: [{
      groupedRowId: 'row-1', groupingKey: { reportDate: '2026-10-24', bookedRoomType: 'STR', occupancyCategory: 'double-child', rateKey: 'numeric:100', currency: 'USD' },
      reportDate: '2026-10-24', bookedRoomType: 'STR', adults: 2, children: 1, occupancyCategory: 'double-child', roomCount: 2, nights: 1,
      rate: { kind: 'numeric', value: '100' }, currency: 'USD', pricingStatus: 'resolved', dataCompleteness: 'complete', financialCompleteness: 'complete', issues: [], sourceRefs: [],
    }],
  }],
};

describe('Excel builders', () => {
  it('creates one USD worksheet with editable rate and guarded formula', async () => {
    const workbook = await buildUsdWorkbook(baseModel);
    expect(workbook.worksheets).toHaveLength(1);
    const sheet = workbook.worksheets[0];
    const rateCell = sheet.getCell('D12');
    expect(rateCell.value).toBe(100);
    expect(sheet.getCell('F12').value).toMatchObject({ formula: expect.stringContaining('ISNUMBER(D12)') });
    expect(sheet.pageSetup.fitToWidth).toBe(1);
    expect(sheet.pageSetup.fitToHeight).toBe(0);
    expect(sheet.pageSetup.orientation).toBe('portrait');
    expect(sheet.views[0].rightToLeft).toBe(false);
    expect(sheet.getImages()).toHaveLength(1);
    expect(sheet.getCell('B2').font.name).toBe('Times New Roman');
    expect(sheet.getCell('B10').border.top?.style).toBe('medium');
    expect(sheet.getCell('B26').value).toBeNull();
  });

  it('creates Hebrew VAT formulas and RTL view', async () => {
    const workbook = await buildHebrewWorkbook({ ...baseModel, nights: [{ ...baseModel.nights[0], roomCharges: [{ ...baseModel.nights[0].roomCharges[0], currency: 'ILS', groupingKey: { ...baseModel.nights[0].roomCharges[0].groupingKey, currency: 'ILS' } }] }] });
    const sheet = workbook.worksheets[0];
    expect(sheet.views[0].rightToLeft).toBe(true);
    expect(sheet.getCell('F12').value).toMatchObject({ formula: expect.stringContaining('ISNUMBER(D12)') });
    expect(sheet.getCell('G12').value).toMatchObject({ formula: expect.stringContaining('18%') });
    expect(sheet.getCell('H12').value).toMatchObject({ formula: expect.stringContaining('F12+G12') });
    expect(sheet.getCell('B2').font.name).toBe('Arial');
    expect((sheet.getCell('B10').fill as ExcelJS.FillPattern).fgColor?.argb).toBe('FFC0C0C0');
    expect((sheet.getCell('B11').fill as ExcelJS.FillPattern).fgColor?.argb).toBe('FFFF8080');
    expect((sheet.getCell('B13').fill as ExcelJS.FillPattern).fgColor?.argb).toBe('FFFF99CC');
    expect((sheet.getCell('H15').fill as ExcelJS.FillPattern).fgColor?.argb).toBe('FFFFFF00');
  });

  it('preserves formulas and one-sheet structure after xlsx serialization', async () => {
    const workbook = await buildUsdWorkbook(baseModel);
    const buffer = await workbook.xlsx.writeBuffer();
    const reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(buffer);
    expect(reloaded.worksheets).toHaveLength(1);
    expect(reloaded.worksheets[0].getCell('F12').value).toMatchObject({ formula: expect.stringContaining('ISNUMBER(D12)') });
  });
});
