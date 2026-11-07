import ExcelJS from 'exceljs';
import type { ExportLanguage } from '../../domain/export/models';
import type { CanonicalExportModel, CanonicalRoomChargeRow } from '../../domain/export/models';
import { ROOM_TYPES } from '../../domain/rooms/roomTypes';
import { ORIENT_LOGO_DATA_URL } from './orientLogo';

type VisualStyle = {
  fontName: string;
  titleSize: number;
  sectionSize: number;
  headerSize: number;
  bodySize: number;
  border: string;
  sectionFill?: string;
  headerFill?: string;
  subtotalFill?: string;
  grandTotalFill?: string;
  warningFill: string;
};

const VISUAL_STYLES: Record<ExportLanguage, VisualStyle> = {
  hebrew: {
    fontName: 'Arial', titleSize: 14, sectionSize: 12, headerSize: 10, bodySize: 10,
    border: 'FF000000', sectionFill: 'FFC0C0C0', headerFill: 'FFFF8080', subtotalFill: 'FFFF99CC', grandTotalFill: 'FFFFFF00', warningFill: 'FFFFC7CE',
  },
  usd: {
    fontName: 'Times New Roman', titleSize: 14, sectionSize: 12, headerSize: 11, bodySize: 11,
    border: 'FF000000', warningFill: 'FFFFC7CE',
  },
};

export async function buildHebrewWorkbook(model: CanonicalExportModel): Promise<ExcelJS.Workbook> {
  return buildHebrewWorkbookScratch(model);
}

export async function buildUsdWorkbook(model: CanonicalExportModel): Promise<ExcelJS.Workbook> {
  return buildWorkbook(model, 'usd');
}

export async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function buildHebrewWorkbookScratch(model: CanonicalExportModel): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const style = VISUAL_STYLES.hebrew;
  workbook.creator = 'Hotel Breakdown V1';
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  const worksheet = workbook.addWorksheet('Hotel Breakdown', {
    views: [{ rightToLeft: true, showGridLines: false }],
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  worksheet.pageSetup.margins = { left: 0.33, right: 0.48, top: 0.36, bottom: 0.35, header: 0.22, footer: 0.25 };
  worksheet.properties.defaultRowHeight = 15;
  worksheet.columns = [
    { width: 12.7 },
    { width: 35.1 },
    { width: 14 },
    { width: 7.1 },
    { width: 6.3 },
    { width: 22.1 },
    { width: 2 },
  ];

  const logoId = workbook.addImage({ base64: ORIENT_LOGO_DATA_URL, extension: 'jpeg' });
  worksheet.addImage(logoId, 'B1:D5');

  const labels = {
    title: 'פירוט מלון',
    draft: 'טיוטה',
    group: 'שם הקבוצה',
    hotel: 'מלון מארח',
    dates: 'תאריכי דיווח',
    currency: 'מטבע',
    checkIn: 'צ׳ק-אין',
    checkOut: 'צ׳ק-אאוט',
    section: 'פירוט עלויות',
    description: 'הרכב',
    rate: 'מחיר בשקלים',
    rooms: 'חדרים',
    nights: 'לילות',
    total: 'סה״כ',
    beforeVat: 'סה״כ לחדרים לא כולל מע״מ',
    vat: 'מע״מ 18%',
    includingVat: 'סה״כ לחדרים כולל מע״מ',
    summary: 'סיכום',
  };

  worksheet.mergeCells('B6:F6');
  worksheet.getCell('B6').value = labels.title;
  styleMergedRow(worksheet, 6, 2, 6, styleTitle, style);
  worksheet.mergeCells('B7:F7');
  worksheet.getCell('B7').value = labels.draft;
  styleMergedRow(worksheet, 7, 2, 6, styleDraft, style);

  writeHebrewMetadataRow(worksheet, 8, labels.group, model.metadata.groupName ?? '—', style);
  writeHebrewMetadataRow(worksheet, 9, labels.hotel, model.metadata.hotelName ?? '—', style);
  writeHebrewMetadataRow(worksheet, 10, labels.dates, model.metadata.reportDates.join(', '), style);
  writeHebrewMetadataRow(worksheet, 11, labels.currency, 'ILS', style);
  worksheet.getCell('B12').value = labels.checkIn;
  worksheet.getCell('C12').value = model.metadata.checkInDate ?? '—';
  worksheet.getCell('D12').value = labels.checkOut;
  worksheet.getCell('E12').value = model.metadata.checkOutDate ?? '—';
  styleMetadataLabel(worksheet.getCell('B12'), style);
  styleMetadataValue(worksheet.getCell('C12'), style);
  styleMetadataLabel(worksheet.getCell('D12'), style);
  styleMetadataValue(worksheet.getCell('E12'), style);

  let row = 14;
  const nightlyBeforeRefs: string[] = [];
  const nightlyVatRefs: string[] = [];
  for (const night of model.nights) {
    worksheet.mergeCells(`B${row}:F${row}`);
    worksheet.getCell(`B${row}`).value = `${labels.section} · ${night.reportDate}`;
    styleMergedRow(worksheet, row, 2, 6, styleSection, style);
    row += 1;

    const headers = [labels.description, labels.rate, labels.rooms, labels.nights, labels.total];
    headers.forEach((value, index) => {
      const cell = worksheet.getCell(row, index + 2);
      cell.value = value;
      styleHeader(cell, style, index === 0, index === headers.length - 1);
    });
    row += 1;

    const firstDetailRow = row;
    for (const charge of night.roomCharges) {
      writeHebrewChargeRow(worksheet, row, charge, style);
      row += 1;
    }
    const lastDetailRow = row - 1;
    const range = firstDetailRow <= lastDetailRow ? `F${firstDetailRow}:F${lastDetailRow}` : null;
    const beforeVatRow = row;
    writeHebrewTotalRow(worksheet, beforeVatRow, labels.beforeVat, range ? `=IF(COUNTIF(${range},"")>0,"",SUM(${range}))` : '=""', style.subtotalFill, style);
    row += 1;
    const vatRow = row;
    writeHebrewTotalRow(worksheet, vatRow, labels.vat, `=IF(F${beforeVatRow}="","",F${beforeVatRow}*18%)`, undefined, style);
    row += 1;
    const includingVatRow = row;
    writeHebrewTotalRow(worksheet, includingVatRow, labels.includingVat, `=IF(F${beforeVatRow}="","",F${beforeVatRow}+F${vatRow})`, style.grandTotalFill, style);
    nightlyBeforeRefs.push(`F${beforeVatRow}`);
    nightlyVatRefs.push(`F${vatRow}`);
    row += 2;
  }

  const summaryRow = row;
  worksheet.mergeCells(`B${summaryRow}:F${summaryRow}`);
  worksheet.getCell(`B${summaryRow}`).value = labels.summary;
  styleMergedRow(worksheet, summaryRow, 2, 6, styleSection, style);
  row += 1;

  const overallBeforeVatRow = row;
  const overallBeforeVatFormula = nightlyBeforeRefs.length
    ? `=IF(OR(${nightlyBeforeRefs.map((ref) => `${ref}=""`).join(',')}),"",SUM(${nightlyBeforeRefs.join(',')}))`
    : '=""';
  writeHebrewTotalRow(worksheet, overallBeforeVatRow, labels.beforeVat, overallBeforeVatFormula, style.subtotalFill, style);
  row += 1;
  const overallVatRow = row;
  const overallVatFormula = nightlyVatRefs.length
    ? `=IF(OR(${nightlyVatRefs.map((ref) => `${ref}=""`).join(',')}),"",SUM(${nightlyVatRefs.join(',')}))`
    : '=""';
  writeHebrewTotalRow(worksheet, overallVatRow, labels.vat, overallVatFormula, undefined, style);
  row += 1;
  const overallIncludingVatRow = row;
  writeHebrewTotalRow(worksheet, overallIncludingVatRow, labels.includingVat, `=IF(F${overallBeforeVatRow}="","",F${overallBeforeVatRow}+F${overallVatRow})`, style.grandTotalFill, style);

  worksheet.pageSetup.printArea = `A1:G${overallIncludingVatRow}`;
  return workbook;
}

function writeHebrewMetadataRow(worksheet: ExcelJS.Worksheet, row: number, label: string, value: string, style: VisualStyle) {
  worksheet.getCell(`B${row}`).value = label;
  worksheet.mergeCells(`C${row}:F${row}`);
  worksheet.getCell(`C${row}`).value = value;
  styleMetadataLabel(worksheet.getCell(`B${row}`), style);
  for (let column = 3; column <= 6; column += 1) styleMetadataValue(worksheet.getCell(row, column), style);
}

function writeHebrewChargeRow(worksheet: ExcelJS.Worksheet, row: number, charge: CanonicalRoomChargeRow, style: VisualStyle) {
  worksheet.getCell(`B${row}`).value = `${roomTypeLabel(charge.bookedRoomType, 'hebrew')} · ${occupancyLabel(charge.occupancyCategory, 'hebrew')}`;
  worksheet.getCell(`C${row}`).value = charge.currency === 'ILS' && charge.rate.kind === 'numeric' ? Number(charge.rate.value) : null;
  worksheet.getCell(`D${row}`).value = charge.roomCount;
  worksheet.getCell(`E${row}`).value = charge.nights;
  worksheet.getCell(`F${row}`).value = { formula: `=IF(OR(NOT(ISNUMBER(C${row})),C${row}=""),"",D${row}*C${row}*E${row})` };
  for (let column = 2; column <= 6; column += 1) {
    const cell = worksheet.getCell(row, column);
    cell.font = { name: style.fontName, size: style.bodySize, bold: true, color: { argb: style.border } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: style.border } },
      bottom: { style: 'thin', color: { argb: style.border } },
      left: { style: column === 2 ? 'medium' : 'thin', color: { argb: style.border } },
      right: { style: column === 6 ? 'medium' : 'thin', color: { argb: style.border } },
    };
  }
  if (charge.financialCompleteness === 'incomplete') worksheet.getCell(`B${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.warningFill } };
  for (const column of ['C', 'D', 'E', 'F']) worksheet.getCell(`${column}${row}`).numFmt = '"₪" #,##0.00;[Red]-"₪" #,##0.00';
}

function writeHebrewTotalRow(worksheet: ExcelJS.Worksheet, row: number, label: string, formula: string, fill: string | undefined, style: VisualStyle) {
  worksheet.mergeCells(`B${row}:E${row}`);
  worksheet.getCell(`B${row}`).value = label;
  worksheet.getCell(`F${row}`).value = { formula };
  for (let column = 2; column <= 5; column += 1) {
    const cell = worksheet.getCell(row, column);
    cell.font = { name: style.fontName, size: style.bodySize, bold: true, color: { argb: style.border } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    cell.border = { top: { style: 'medium', color: { argb: style.border } }, bottom: { style: 'medium', color: { argb: style.border } }, left: { style: column === 2 ? 'medium' : 'thin', color: { argb: style.border } }, right: { style: 'thin', color: { argb: style.border } } };
  }
  const value = worksheet.getCell(`F${row}`);
  value.font = { name: style.fontName, size: style.bodySize, bold: true, color: { argb: style.border } };
  value.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  if (fill) value.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
  value.border = { top: { style: 'medium', color: { argb: style.border } }, bottom: { style: 'medium', color: { argb: style.border } }, left: { style: 'thin', color: { argb: style.border } }, right: { style: 'medium', color: { argb: style.border } } };
  value.numFmt = '"₪" #,##0.00;[Red]-"₪" #,##0.00';
}

async function buildWorkbook(model: CanonicalExportModel, language: ExportLanguage): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const style = VISUAL_STYLES[language];
  workbook.creator = 'Hotel Breakdown V1';
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  const worksheet = workbook.addWorksheet('Hotel Breakdown', {
    views: [{ rightToLeft: language === 'hebrew', showGridLines: false }],
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  worksheet.pageSetup.margins = { left: 0.33, right: 0.48, top: 0.36, bottom: 0.35, header: 0.22, footer: 0.25 };
  worksheet.properties.defaultRowHeight = 15;
  const logoId = workbook.addImage({ base64: ORIENT_LOGO_DATA_URL, extension: 'jpeg' });
  worksheet.addImage(logoId, 'B1:D7');

  const labels = language === 'hebrew'
    ? { title: 'פירוט מלון', group: 'שם הקבוצה', hotel: 'מלון מארח', dates: 'תאריכי דיווח', checkIn: 'צ׳ק-אין', checkOut: 'צ׳ק-אאוט', currency: 'מטבע', roomCharges: 'פירוט עלויות', description: 'הרכב', rooms: 'חדרים', rate: 'מחיר בשקלים', nights: 'לילות', beforeVat: 'לפני מע״מ', vat: 'מע״מ 18%', total: 'סה״כ', nightly: 'סה״כ ללילה', overall: 'סה״כ חיובי חדרים', summary: 'סיכום', draft: 'טיוטה' }
    : { title: 'Hotel Breakdown', group: 'Group name', hotel: 'Hotel', dates: 'Dates', checkIn: 'Check-in', checkOut: 'Check-out', currency: 'Currency', roomCharges: 'rooms breakdon', description: 'Occupancy', rooms: 'no. of rooms', rate: 'cost', nights: 'night', beforeVat: '', vat: '', total: 'Total in $', nightly: 'Total Room charges', overall: 'Total Room charges in USD', summary: 'Summary', draft: 'DRAFT' };

  worksheet.columns = language === 'hebrew'
    ? [{ width: 12.7 }, { width: 30 }, { width: 14 }, { width: 9 }, { width: 9 }, { width: 14 }, { width: 14 }, { width: 17 }]
    : [{ width: 10.6 }, { width: 26 }, { width: 13 }, { width: 12 }, { width: 12.7 }, { width: 18.1 }, { width: 2 }];

  const lastColumn = language === 'hebrew' ? 8 : 6;
  worksheet.mergeCells(`B2:${columnLetter(lastColumn)}2`);
  worksheet.getCell('B2').value = labels.title;
  styleMergedRow(worksheet, 2, 2, lastColumn, styleTitle, style);
  worksheet.mergeCells(`B3:${columnLetter(lastColumn)}3`);
  worksheet.getCell('B3').value = labels.draft;
  styleMergedRow(worksheet, 3, 2, lastColumn, styleDraft, style);
  worksheet.getCell('B4').value = labels.group;
  worksheet.getCell('C4').value = model.metadata.groupName;
  worksheet.getCell('B5').value = labels.hotel;
  worksheet.getCell('C5').value = model.metadata.hotelName ?? '—';
  worksheet.getCell('B6').value = labels.dates;
  worksheet.getCell('C6').value = model.metadata.reportDates.join(', ');
  worksheet.getCell('B7').value = labels.currency;
  worksheet.getCell('C7').value = language === 'hebrew' ? 'ILS' : 'USD';
  worksheet.getCell('B8').value = labels.checkIn;
  worksheet.getCell('C8').value = model.metadata.checkInDate ?? '—';
  worksheet.getCell('D8').value = labels.checkOut;
  worksheet.getCell('E8').value = model.metadata.checkOutDate ?? '—';
  for (const address of ['B4', 'B5', 'B6', 'B7', 'B8', 'D8']) styleMetadataLabel(worksheet.getCell(address), style);
  for (const address of ['C4', 'C5', 'C6', 'C7', 'C8', 'E8']) styleMetadataValue(worksheet.getCell(address), style);

  let row = 10;
  const detailTotalRefs: string[] = [];
  const targetCurrency = language === 'hebrew' ? 'ILS' : 'USD';
  for (const night of model.nights) {
    worksheet.mergeCells(`B${row}:${columnLetter(lastColumn)}${row}`);
    worksheet.getCell(`B${row}`).value = `${labels.roomCharges} · ${night.reportDate}`;
    styleMergedRow(worksheet, row, 2, lastColumn, styleSection, style);
    row += 1;
    const headers = language === 'hebrew'
      ? [labels.description, labels.rooms, labels.rate, labels.nights, labels.beforeVat, labels.vat, labels.total]
      : [labels.description, labels.rooms, labels.rate, labels.nights, labels.total];
    headers.forEach((value, index) => {
      const cell = worksheet.getCell(row, index + 2);
      cell.value = value;
      styleHeader(cell, style, index === 0, index === headers.length - 1);
    });
    row += 1;
    const firstDetailRow = row;
    for (const charge of night.roomCharges) {
      writeChargeRow(worksheet, row, charge, language, targetCurrency, style, headers.length);
      row += 1;
    }
    const lastDetailRow = row - 1;
    const totalRow = row;
    worksheet.getCell(`B${totalRow}`).value = labels.nightly;
    styleSubtotalLabel(worksheet.getCell(`B${totalRow}`), style);
    const totalColumn = language === 'hebrew' ? 'H' : 'F';
    const formula = `=IF(COUNTIF(${totalColumn}${firstDetailRow}:${totalColumn}${lastDetailRow},"")>0,"",SUM(${totalColumn}${firstDetailRow}:${totalColumn}${lastDetailRow}))`;
    worksheet.getCell(`${totalColumn}${totalRow}`).value = { formula };
    styleSubtotal(worksheet.getCell(`${totalColumn}${totalRow}`), style);
    if (language === 'hebrew') {
      const beforeVatFormula = `=IF(COUNTIF(F${firstDetailRow}:F${lastDetailRow},"")>0,"",SUM(F${firstDetailRow}:F${lastDetailRow}))`;
      const vatFormula = `=IF(COUNTIF(G${firstDetailRow}:G${lastDetailRow},"")>0,"",SUM(G${firstDetailRow}:G${lastDetailRow}))`;
      worksheet.getCell(`F${totalRow}`).value = { formula: beforeVatFormula };
      worksheet.getCell(`G${totalRow}`).value = { formula: vatFormula };
      styleSubtotal(worksheet.getCell(`F${totalRow}`), style);
      styleSubtotal(worksheet.getCell(`G${totalRow}`), style);
    }
    detailTotalRefs.push(`${totalColumn}${totalRow}`);
    row += 2;
  }

  const overallRow = row;
  worksheet.mergeCells(`B${overallRow}:${columnLetter(lastColumn - 1)}${overallRow}`);
  worksheet.getCell(`B${overallRow}`).value = labels.overall;
  styleMergedRow(worksheet, overallRow, 2, lastColumn - 1, styleSection, style);
  const overallColumn = language === 'hebrew' ? 'H' : 'F';
  worksheet.getCell(`${overallColumn}${overallRow}`).value = {
    formula: `=IF(OR(${detailTotalRefs.map((ref) => `${ref}=""`).join(',')}),"",SUM(${detailTotalRefs.join(',')}))`,
  };
    styleTotalValue(worksheet.getCell(`${overallColumn}${overallRow}`), style);

  row += 2;
  const summaryRow = row;
  worksheet.mergeCells(`B${summaryRow}:${language === 'hebrew' ? 'H' : 'F'}${summaryRow}`);
  worksheet.getCell(`B${summaryRow}`).value = labels.summary;
  styleMergedRow(worksheet, summaryRow, 2, lastColumn, styleSection, style);
  row += 1;
  worksheet.getCell(`B${row}`).value = labels.overall;
  styleSubtotalLabel(worksheet.getCell(`B${row}`), style);
  worksheet.getCell(`${overallColumn}${row}`).value = { formula: `${overallColumn}${overallRow}` };
  styleSubtotal(worksheet.getCell(`${overallColumn}${row}`), style);
  worksheet.pageSetup.printArea = `A1:${columnLetter(lastColumn)}${row}`;
  return workbook;
}

function writeChargeRow(
  worksheet: ExcelJS.Worksheet,
  row: number,
  charge: CanonicalRoomChargeRow,
  language: ExportLanguage,
  targetCurrency: string,
  style: VisualStyle,
  tableColumnCount: number,
) {
  const description = `${roomTypeLabel(charge.bookedRoomType, language)} · ${occupancyLabel(charge.occupancyCategory, language)}${charge.currency && charge.currency !== targetCurrency ? ` · ${charge.currency}` : ''}`;
  worksheet.getCell(`B${row}`).value = description;
  worksheet.getCell(`C${row}`).value = charge.roomCount;
  worksheet.getCell(`D${row}`).value = charge.currency === targetCurrency && charge.rate.kind === 'numeric' ? Number(charge.rate.value) : null;
  worksheet.getCell(`E${row}`).value = charge.nights;
  const beforeVat = `=IF(OR(NOT(ISNUMBER(D${row})),D${row}=""),"",C${row}*D${row}*E${row})`;
  if (language === 'hebrew') {
    worksheet.getCell(`F${row}`).value = { formula: beforeVat };
    worksheet.getCell(`G${row}`).value = { formula: `=IF(F${row}="","",F${row}*18%)` };
    worksheet.getCell(`H${row}`).value = { formula: `=IF(F${row}="","",F${row}+G${row})` };
  } else {
    worksheet.getCell(`F${row}`).value = { formula: beforeVat };
  }
  const incomplete = charge.financialCompleteness === 'incomplete';
  for (let column = 2; column <= tableColumnCount + 1; column += 1) {
    const cell = worksheet.getCell(row, column);
    cell.font = { name: style.fontName, size: style.bodySize, bold: true, color: { argb: style.border } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: style.border } },
      bottom: { style: 'thin', color: { argb: style.border } },
      left: { style: column === 2 ? 'medium' : 'thin', color: { argb: style.border } },
      right: { style: column === tableColumnCount + 1 ? 'medium' : 'thin', color: { argb: style.border } },
    };
  }
  if (incomplete) worksheet.getCell(`B${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.warningFill } };
  for (const column of language === 'hebrew' ? ['C', 'D', 'E', 'F', 'G', 'H'] : ['C', 'D', 'E', 'F']) {
    worksheet.getCell(`${column}${row}`).numFmt = language === 'hebrew'
      ? '"₪" #,##0.00;[Red]-"₪" #,##0.00'
      : '"$" #,##0.00;[Red]-"$" #,##0.00';
  }
}

function roomTypeLabel(code: string | null, language: ExportLanguage): string {
  if (!code) return language === 'hebrew' ? 'סוג חדר לא פתור' : 'Unresolved room type';
  const roomType = ROOM_TYPES.find((item) => item.code === code);
  return roomType ? (language === 'hebrew' ? roomType.he : roomType.en) : code;
}

function occupancyLabel(category: string, language: ExportLanguage): string {
  const labels: Record<string, [string, string]> = {
    single: ['יחיד', 'Single'],
    double: ['זוג', 'Double'],
    triple: ['שלושה', 'Triple'],
    'single-child': ['יחיד + ילד', 'Single + Child'],
    'double-child': ['זוג + ילד', 'Double + Child'],
    'double-two-children': ['זוג + 2 ילדים', 'Double + 2 Children'],
    unresolved: ['תפוסה לא פתורה', 'Unresolved'],
  };
  return labels[category]?.[language === 'hebrew' ? 0 : 1] ?? category;
}

function styleTitle(cell: ExcelJS.Cell, style: VisualStyle) {
  cell.font = { name: style.fontName, bold: true, size: style.titleSize, color: { argb: style.border } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = { bottom: { style: 'medium', color: { argb: style.border } } };
}

function styleDraft(cell: ExcelJS.Cell, style: VisualStyle) {
  cell.font = { name: style.fontName, bold: true, size: style.headerSize, color: { argb: style.border } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
}

function styleSection(cell: ExcelJS.Cell, style: VisualStyle) {
  cell.font = { name: style.fontName, bold: true, size: style.sectionSize, color: { argb: style.border } };
  if (style.sectionFill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.sectionFill } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = { top: { style: 'medium', color: { argb: style.border } }, bottom: { style: 'medium', color: { argb: style.border } }, left: { style: 'medium', color: { argb: style.border } }, right: { style: 'medium', color: { argb: style.border } } };
}

function styleHeader(cell: ExcelJS.Cell, style: VisualStyle, first: boolean, last: boolean) {
  cell.font = { name: style.fontName, bold: true, size: style.headerSize, color: { argb: style.border } };
  if (style.headerFill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.headerFill } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = { top: { style: 'medium', color: { argb: style.border } }, bottom: { style: 'thin', color: { argb: style.border } }, left: { style: first ? 'medium' : 'thin', color: { argb: style.border } }, right: { style: last ? 'medium' : 'thin', color: { argb: style.border } } };
}

function styleMetadataLabel(cell: ExcelJS.Cell, style: VisualStyle) {
  cell.font = { name: style.fontName, bold: true, size: style.headerSize, color: { argb: style.border } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = { top: { style: 'thin', color: { argb: style.border } }, bottom: { style: 'thin', color: { argb: style.border } }, left: { style: 'medium', color: { argb: style.border } }, right: { style: 'thin', color: { argb: style.border } } };
}

function styleMetadataValue(cell: ExcelJS.Cell, style: VisualStyle) {
  cell.font = { name: style.fontName, size: style.bodySize, color: { argb: style.border } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = { top: { style: 'thin', color: { argb: style.border } }, bottom: { style: 'thin', color: { argb: style.border } }, left: { style: 'thin', color: { argb: style.border } }, right: { style: 'medium', color: { argb: style.border } } };
}

function styleSubtotalLabel(cell: ExcelJS.Cell, style: VisualStyle) {
  cell.font = { name: style.fontName, bold: true, size: style.bodySize, color: { argb: style.border } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  if (style.subtotalFill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.subtotalFill } };
  cell.border = { top: { style: 'medium', color: { argb: style.border } }, bottom: { style: 'medium', color: { argb: style.border } }, left: { style: 'medium', color: { argb: style.border } }, right: { style: 'thin', color: { argb: style.border } } };
}

function styleSubtotal(cell: ExcelJS.Cell, style: VisualStyle) {
  cell.font = { name: style.fontName, bold: true, size: style.bodySize, color: { argb: style.border } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  if (style.subtotalFill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.subtotalFill } };
  cell.border = { top: { style: 'medium', color: { argb: style.border } }, bottom: { style: 'medium', color: { argb: style.border } }, left: { style: 'thin', color: { argb: style.border } }, right: { style: 'medium', color: { argb: style.border } } };
  cell.numFmt = '#,##0.00;[Red]-#,##0.00';
}

function styleTotalValue(cell: ExcelJS.Cell, style: VisualStyle) {
  cell.font = { name: style.fontName, bold: true, size: style.bodySize, color: { argb: style.border } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  if (style.grandTotalFill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.grandTotalFill } };
  cell.border = { top: { style: 'medium', color: { argb: style.border } }, bottom: { style: 'medium', color: { argb: style.border } }, left: { style: 'thin', color: { argb: style.border } }, right: { style: 'medium', color: { argb: style.border } } };
  cell.numFmt = '#,##0.00;[Red]-#,##0.00';
}

function styleMergedRow(
  worksheet: ExcelJS.Worksheet,
  row: number,
  firstColumn: number,
  lastColumn: number,
  styler: (cell: ExcelJS.Cell, style: VisualStyle) => void,
  style: VisualStyle,
) {
  for (let column = firstColumn; column <= lastColumn; column += 1) {
    styler(worksheet.getCell(row, column), style);
  }
}

function columnLetter(column: number): string {
  let value = column;
  let result = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}
