import ExcelJS from 'exceljs';
import type { ExportLanguage } from '../../domain/export/models';
import type { CanonicalExportModel, CanonicalNight, CanonicalRoomChargeRow } from '../../domain/export/models';
import { ROOM_TYPES } from '../../domain/rooms/roomTypes';
import { ORIENT_LOGO_DATA_URL } from './orientLogo';

const ENGLISH_LOGO_URL = new URL('./isrotelLogo.jpg', import.meta.url).href;
const ENGLISH_INDEXED_BLACK = { indexed: 64 } as unknown as ExcelJS.Color;
const ENGLISH_INDEXED_WHITE = { indexed: 64 } as unknown as ExcelJS.Color;

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
  'english-ils': {
    fontName: 'Times New Roman', titleSize: 14, sectionSize: 12, headerSize: 11, bodySize: 11,
    border: 'FF000000', warningFill: 'FFFFC7CE',
  },
};

const HEBREW_TEMPLATE_STYLE = {
  columns: { a: 12.7109375, b: 35.140625, c: 14, d: 7.140625, e: 6.28515625, f: 22.140625, g: 9 },
  rows: { title: 20.25, draft: 18, metadata: 18, metadataCompact: 15, section: 15.75, header: 15, body: 15, wrappedBody: 30 },
  colors: {
    section: 'FFC0C0C0', sectionBackground: 'FFCCCCFF', header: 'FFFF8080', headerBackground: 'FFFF99CC',
    beforeVat: 'FFFF99CC', beforeVatBackground: 'FFFF8080', overall: 'FFFFFF00', overallBackground: 'FFFFFF00', warning: 'FFFFC7CE', border: 'FF000000',
  },
  imageRange: {
    tl: { nativeCol: 2, nativeColOff: 83005, nativeRow: 1, nativeRowOff: 156604 },
    br: { nativeCol: 4, nativeColOff: 304765, nativeRow: 8, nativeRowOff: 32404 },
  },
  print: { left: 0.329861111111111, right: 0.479861111111111, top: 0.359722222222222, bottom: 0.35, header: 0.511811023622047, footer: 0.511811023622047 },
  pageSetup: { paperSize: 9, scale: 90, fitToPage: false, fitToWidth: 1, fitToHeight: 1, horizontalDpi: 300, verticalDpi: 300, firstPageNumber: 1 },
  numberFormats: { currency: '"₪ "#,##0', integer: '#,##0;[Red]-#,##0' },
} as const;

const ENGLISH_TEMPLATE_STYLE = {
  columns: { a: 10.5703125, b: 25.7109375, c: 14, d: 12, e: 12.7109375, f: 18.140625 },
  rows: { default: 12.75, issueDate: 15.75, headerValue: 19.5, metadata: 18.75, group: 24, section: 19.5, tableHeader: 13.5, detail: 13.5, subtotal: 15, combined: 16.5, staffHeader: 16.5, staffTableHeader: 15.75, staffDetail: 14.25, ancillary: 16.5, ancillaryDetail: 15.75 },
  colors: { themeSection: 5, themeOverall: 4, themeDetail: 0, indexedAncillaryHeader: 43, indexedBackground: 64, sectionTint: 0.3999755851924192, overallTint: 0.5999938962981048 },
  border: { style: 'medium' as const, color: ENGLISH_INDEXED_BLACK },
  numberFormats: { usd: '[$$-409]#,##0.00', usdAccounting: '_-[$$-409]* #,##0.00_ ;_-[$$-409]* -#,##0.00 ;_-[$$-409]* "-"??_ ;_-@_ ', ils: '"₪ "#,##0' },
  print: { left: 0.33, right: 0.48, top: 0.36, bottom: 0.35, header: 0.22, footer: 0.25 },
  pageSetup: { paperSize: 9, scale: 76, fitToPage: false, fitToWidth: 1, fitToHeight: 1, horizontalDpi: 300, verticalDpi: 300, firstPageNumber: 1 },
  imageRange: { tl: { nativeCol: 2, nativeColOff: 85725, nativeRow: 0, nativeRowOff: 0 }, br: { nativeCol: 4, nativeColOff: 428625, nativeRow: 6, nativeRowOff: 9525 } },
} as const;

export async function buildHebrewWorkbook(model: CanonicalExportModel): Promise<ExcelJS.Workbook> {
  return buildHebrewWorkbookScratch(model);
}

export async function buildUsdWorkbook(model: CanonicalExportModel, currency: 'USD' | 'ILS' = 'USD'): Promise<ExcelJS.Workbook> {
  return buildEnglishUsdWorkbook(model, currency);
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

  const worksheet = workbook.addWorksheet('גיליון', {
    views: [{ rightToLeft: true, showGridLines: true, showRuler: true, showRowColHeaders: true, zoomScale: 124, zoomScaleNormal: 124 }],
    pageSetup: { orientation: 'portrait', ...HEBREW_TEMPLATE_STYLE.pageSetup },
  });
  worksheet.pageSetup.margins = HEBREW_TEMPLATE_STYLE.print;
  worksheet.properties.defaultRowHeight = 12.75;
  worksheet.properties.defaultColWidth = 9;
  worksheet.columns = [
    { width: HEBREW_TEMPLATE_STYLE.columns.a },
    { width: HEBREW_TEMPLATE_STYLE.columns.b },
    { width: HEBREW_TEMPLATE_STYLE.columns.c },
    { width: HEBREW_TEMPLATE_STYLE.columns.d },
    { width: HEBREW_TEMPLATE_STYLE.columns.e },
    { width: HEBREW_TEMPLATE_STYLE.columns.f },
    { width: HEBREW_TEMPLATE_STYLE.columns.g },
  ];

  const logoId = workbook.addImage({ base64: ORIENT_LOGO_DATA_URL, extension: 'jpeg' });
  worksheet.addImage(logoId, HEBREW_TEMPLATE_STYLE.imageRange as unknown as ExcelJS.ImageRange);

  const labels = {
    documentDate: 'תאריך הוצאת המסמך',
    recipient: 'לידי',
    group: 'שם הקבוצה',
    hotel: 'מלון מארח',
    hostingDate: 'תאריך אירוח',
    booking: 'הזמנה ',
    section: 'פירוט עלויות',
    description: 'הרכב',
    rate: 'מחיר בשקלים',
    rooms: 'חדרים',
    nights: 'לילות',
    total: 'סה״כ',
    beforeVat: 'סה״כ לחדרים לא כולל מע״מ',
    includingVat: 'סה״כ לחדרים כולל מע״מ',
  };

  writeHebrewTemplateHeader(worksheet, model, labels, style);

  let row = 15;
  const includingVatRefs: string[] = [];
  for (const night of model.nights) {
    const section = writeHebrewRoomSection(worksheet, row, night, labels, style);
    includingVatRefs.push(`F${section.includingVatRow}`);
    row = section.nextRow;
  }

  const combinedRow = row;
  const combinedFormula = includingVatRefs.length
    ? `=IF(OR(${includingVatRefs.map((ref) => `${ref}=""`).join(',')}),"",SUM(${includingVatRefs.join(',')}))`
    : '=""';
  writeHebrewTotalRow(worksheet, combinedRow, labels.includingVat, combinedFormula, HEBREW_TEMPLATE_STYLE.colors.overall, style, 'combined');

  const staffStartRow = combinedRow + 2;
  const staff = writeHebrewComplimentaryStaffSection(worksheet, staffStartRow, model, style);
  const extrasStartRow = staff.includingVatRow + 2;
  const extras = writeHebrewAdditionalChargesSection(worksheet, extrasStartRow, model, style);
  const finalTotalRow = extras.includingVatRow + 2;
  writeHebrewTotalRow(
    worksheet,
    finalTotalRow,
    'סה"כ לתשלום חדרים + עלויות נלוות כולל מע"מ',
    `=IF(OR(F${combinedRow}="",F${staff.includingVatRow}="",F${extras.includingVatRow}=""),"",F${combinedRow}+F${staff.includingVatRow}+F${extras.includingVatRow})`,
    HEBREW_TEMPLATE_STYLE.colors.header,
    style,
    'includingVat',
  );
  writeHebrewPaymentRow(worksheet, finalTotalRow + 1, style);
  const balanceRow = finalTotalRow + 2;
  writeHebrewTotalRow(
    worksheet,
    balanceRow,
    'סה"כ לתשלום חדרים + עלויות נלוות כולל מע"מ',
    `=IF(OR(F${finalTotalRow}="",F${finalTotalRow + 1}=""),"",F${finalTotalRow}-F${finalTotalRow + 1})`,
    HEBREW_TEMPLATE_STYLE.colors.header,
    style,
    'includingVat',
  );
  const footerEndRow = writeHebrewFooter(worksheet, balanceRow + 1, style);
  worksheet.pageSetup.printArea = `A3:G${footerEndRow}`;
  return workbook;
}

function writeHebrewAdditionalChargesSection(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  model: CanonicalExportModel,
  style: VisualStyle,
): { includingVatRow: number } {
  worksheet.mergeCells(`B${startRow}:F${startRow}`);
  worksheet.getCell(`B${startRow}`).value = 'עלויות נלוות';
  worksheet.getRow(startRow).height = HEBREW_TEMPLATE_STYLE.rows.body;
  styleMergedRow(worksheet, startRow, 2, 6, styleHebrewSection, style);
  const detailCount = model.additionalCharges?.length ?? 0;
  const firstRow = startRow + 1;
  for (let index = 0; index < detailCount; index += 1) {
    const row = firstRow + index;
    const charge = model.additionalCharges?.[index];
    writeHebrewAdditionalChargeRow(worksheet, row, charge, style);
  }
  const subtotalRow = firstRow + detailCount;
  const dataCount = model.additionalCharges?.length ?? 0;
  const dataLastRow = firstRow + dataCount - 1;
  worksheet.mergeCells(`B${subtotalRow}:E${subtotalRow}`);
  worksheet.getCell(`B${subtotalRow}`).value = 'סה"כ לאקסטרות לא כולל מע"מ';
  for (let column = 2; column <= 5; column += 1) styleHebrewTotalLabel(worksheet.getCell(subtotalRow, column), style, 'subtotal', style.subtotalFill);
  worksheet.getCell(`F${subtotalRow}`).value = { formula: dataCount ? `=IF(COUNTIF(F${firstRow}:F${dataLastRow},"")>0,"",SUM(F${firstRow}:F${dataLastRow}))` : '=""' };
  styleHebrewTotalValue(worksheet.getCell(`F${subtotalRow}`), style, 'subtotal', style.subtotalFill);
  worksheet.getCell(`F${subtotalRow}`).numFmt = HEBREW_TEMPLATE_STYLE.numberFormats.currency;
  const includingVatRow = subtotalRow + 1;
  worksheet.mergeCells(`B${includingVatRow}:E${includingVatRow}`);
  worksheet.getCell(`B${includingVatRow}`).value = 'סה\'\'כ לאקסטרות כולל מע"מ';
  for (let column = 2; column <= 5; column += 1) styleHebrewTotalLabel(worksheet.getCell(includingVatRow, column), style, 'includingVat', HEBREW_TEMPLATE_STYLE.colors.header);
  worksheet.getCell(`F${includingVatRow}`).value = { formula: `=IF(F${subtotalRow}="","",F${subtotalRow}*1.18)` };
  styleHebrewTotalValue(worksheet.getCell(`F${includingVatRow}`), style, 'includingVat', HEBREW_TEMPLATE_STYLE.colors.header);
  worksheet.getCell(`F${includingVatRow}`).numFmt = HEBREW_TEMPLATE_STYLE.numberFormats.currency;
  return { includingVatRow };
}

function writeHebrewAdditionalChargeRow(
  worksheet: ExcelJS.Worksheet,
  row: number,
  charge: NonNullable<CanonicalExportModel['additionalCharges']>[number] | undefined,
  style: VisualStyle,
) {
  const complete = Boolean(charge?.financialCompleteness === 'complete' && charge?.currency === 'ILS');
  worksheet.getCell(`B${row}`).value = charge ? `${charge.description || 'תיאור לא פתור'}${charge.currency !== 'ILS' ? ` · ${charge.currency}` : ''}` : null;
  worksheet.getCell(`C${row}`).value = complete && charge?.price.kind === 'numeric' ? Number(charge.price.value) : null;
  worksheet.getCell(`D${row}`).value = charge?.quantity.kind === 'numeric' ? Number(charge.quantity.value) : null;
  worksheet.getCell(`E${row}`).value = charge?.number.kind === 'numeric' ? Number(charge.number.value) : null;
  worksheet.getCell(`F${row}`).value = complete
    ? { formula: `=IF(OR(NOT(ISNUMBER(C${row})),NOT(ISNUMBER(D${row})),NOT(ISNUMBER(E${row}))),"",C${row}*D${row}*E${row})` }
    : { formula: '=""' };
  styleHebrewTemplateDetailRow(worksheet, row, style, !complete && Boolean(charge));
  worksheet.getCell(`C${row}`).numFmt = HEBREW_TEMPLATE_STYLE.numberFormats.currency;
  worksheet.getCell(`F${row}`).numFmt = HEBREW_TEMPLATE_STYLE.numberFormats.currency;
}

function writeHebrewComplimentaryStaffSection(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  model: CanonicalExportModel,
  style: VisualStyle,
): { includingVatRow: number } {
  worksheet.mergeCells(`B${startRow}:F${startRow}`);
  worksheet.getCell(`B${startRow}`).value = 'צוות וחופשיים';
  worksheet.getRow(startRow).height = HEBREW_TEMPLATE_STYLE.rows.body;
  styleMergedRow(worksheet, startRow, 2, 6, styleHebrewSection, style);
  const detailCount = model.complimentaryStaff?.length ?? 0;
  const firstRow = startRow + 1;
  for (let index = 0; index < detailCount; index += 1) {
    const row = firstRow + index;
    const charge = model.complimentaryStaff?.[index];
    writeHebrewComplimentaryStaffRow(worksheet, row, charge, style);
  }
  const subtotalRow = firstRow + detailCount;
  const dataCount = model.complimentaryStaff?.length ?? 0;
  const dataLastRow = firstRow + dataCount - 1;
  worksheet.mergeCells(`B${subtotalRow}:E${subtotalRow}`);
  worksheet.getCell(`B${subtotalRow}`).value = 'סה"כ צוות וחופשיים לא כולל מע"מ';
  for (let column = 2; column <= 5; column += 1) styleHebrewTotalLabel(worksheet.getCell(subtotalRow, column), style, 'subtotal', style.subtotalFill);
  worksheet.getCell(`F${subtotalRow}`).value = { formula: dataCount ? `=IF(COUNTIF(F${firstRow}:F${dataLastRow},"")>0,"",SUM(F${firstRow}:F${dataLastRow}))` : '=""' };
  styleHebrewTotalValue(worksheet.getCell(`F${subtotalRow}`), style, 'subtotal', style.subtotalFill);
  worksheet.getCell(`F${subtotalRow}`).numFmt = HEBREW_TEMPLATE_STYLE.numberFormats.currency;
  const includingVatRow = subtotalRow + 1;
  worksheet.mergeCells(`B${includingVatRow}:E${includingVatRow}`);
  worksheet.getCell(`B${includingVatRow}`).value = 'סה"כ צוות וחופשיים  כולל מע"מ';
  for (let column = 2; column <= 5; column += 1) styleHebrewTotalLabel(worksheet.getCell(includingVatRow, column), style, 'includingVat', HEBREW_TEMPLATE_STYLE.colors.header);
  worksheet.getCell(`F${includingVatRow}`).value = { formula: `=IF(F${subtotalRow}="","",F${subtotalRow}*1.18)` };
  styleHebrewTotalValue(worksheet.getCell(`F${includingVatRow}`), style, 'includingVat', HEBREW_TEMPLATE_STYLE.colors.header);
  worksheet.getCell(`F${includingVatRow}`).numFmt = HEBREW_TEMPLATE_STYLE.numberFormats.currency;
  return { includingVatRow };
}

function writeHebrewComplimentaryStaffRow(
  worksheet: ExcelJS.Worksheet,
  row: number,
  charge: NonNullable<CanonicalExportModel['complimentaryStaff']>[number] | undefined,
  style: VisualStyle,
) {
  const complete = Boolean(charge?.completeness === 'complete' && charge?.currency === 'ILS');
  worksheet.getCell(`B${row}`).value = charge ? (charge.type === 'free' ? 'חופשי' : 'צוות') : null;
  worksheet.getCell(`C${row}`).value = complete && charge?.amount.kind === 'numeric' ? Number(charge.amount.value) : null;
  worksheet.getCell(`D${row}`).value = charge?.number.kind === 'numeric' ? Number(charge.number.value) : null;
  worksheet.getCell(`E${row}`).value = complete ? 1 : null;
  worksheet.getCell(`F${row}`).value = complete
    ? { formula: `=IF(OR(NOT(ISNUMBER(C${row})),NOT(ISNUMBER(D${row})),NOT(ISNUMBER(E${row}))),"",C${row}*D${row}*E${row})` }
    : { formula: '=""' };
  styleHebrewTemplateDetailRow(worksheet, row, style, !complete && Boolean(charge));
  worksheet.getCell(`C${row}`).numFmt = HEBREW_TEMPLATE_STYLE.numberFormats.currency;
  worksheet.getCell(`F${row}`).numFmt = HEBREW_TEMPLATE_STYLE.numberFormats.currency;
}

function writeHebrewPaymentRow(worksheet: ExcelJS.Worksheet, row: number, style: VisualStyle) {
  worksheet.getRow(row).height = HEBREW_TEMPLATE_STYLE.rows.body;
  worksheet.mergeCells(`B${row}:E${row}`);
  worksheet.getCell(`B${row}`).value = 'שולם עבור עסקה';
  for (let column = 2; column <= 5; column += 1) styleHebrewTotalLabel(worksheet.getCell(row, column), style, 'includingVat', HEBREW_TEMPLATE_STYLE.colors.header);
  const value = worksheet.getCell(`F${row}`);
  value.value = null;
  styleHebrewTotalValue(value, style, 'includingVat', HEBREW_TEMPLATE_STYLE.colors.header);
  value.numFmt = HEBREW_TEMPLATE_STYLE.numberFormats.currency;
}

function writeHebrewFooter(worksheet: ExcelJS.Worksheet, startRow: number, style: VisualStyle): number {
  worksheet.getRow(startRow).height = HEBREW_TEMPLATE_STYLE.rows.metadataCompact;
  worksheet.getCell(`B${startRow}`).value = 'הערות:';
  worksheet.getCell(`B${startRow}`).font = { name: style.fontName, size: 12, color: { argb: style.border } };
  worksheet.getCell(`B${startRow}`).border = { top: { style: 'medium', color: { argb: style.border } }, bottom: { style: 'medium', color: { argb: style.border } }, left: { style: 'medium', color: { argb: style.border } } };
  const approval = 'נא להחזיר גמר חשבון זה מאושר על ידכם, תוך 5 ימי עבודה מיום קבלתו, לפקס 03-7608421';
  const warning = 'במידה ולא יתקבל האישור חתום (ע"י מורשה חתימה), אנו רואים זאת כאישור החשבון, תוצא חשבונית בהתאם.';
  for (let column = 2; column <= 6; column += 1) {
    worksheet.getCell(startRow, column).border = {
      top: { style: 'medium', color: { argb: style.border } },
      bottom: { style: 'medium', color: { argb: style.border } },
      ...(column === 2 ? { left: { style: 'medium' as const, color: { argb: style.border } } } : {}),
      ...(column === 6 ? { right: { style: 'medium' as const, color: { argb: style.border } } } : {}),
    };
  }
  worksheet.mergeCells(`A${startRow + 1}:F${startRow + 1}`);
  worksheet.getCell(`A${startRow + 1}`).value = approval;
  worksheet.mergeCells(`A${startRow + 2}:F${startRow + 2}`);
  worksheet.getCell(`A${startRow + 2}`).value = warning;
  for (const row of [startRow + 1, startRow + 2]) {
    worksheet.getRow(row).height = HEBREW_TEMPLATE_STYLE.rows.body;
    const cell = worksheet.getCell(`A${row}`);
    cell.font = { name: style.fontName, size: 12, italic: true, color: { argb: style.border } };
    cell.alignment = { horizontal: 'right' };
  }
  worksheet.getCell(`B${startRow + 3}`).value = 'שם  המאשר (מורשה חתימה)';
  worksheet.getCell(`B${startRow + 5}`).value = 'חתימה + חותמת חברה';
  for (const row of [startRow + 3, startRow + 5]) {
    worksheet.getRow(row).height = HEBREW_TEMPLATE_STYLE.rows.body;
    worksheet.getCell(`B${row}`).font = { name: style.fontName, size: 12, color: { argb: style.border } };
    for (let column = 3; column <= 5; column += 1) {
      worksheet.getCell(row, column).alignment = { horizontal: 'center' };
      worksheet.getCell(row, column).border = { bottom: { style: 'thin', color: { argb: style.border } } };
    }
  }
  worksheet.mergeCells(`A${startRow + 7}:G${startRow + 7}`);
  worksheet.getCell(`A${startRow + 7}`).value = "ישרוטל  לקבוצות, מגדל אקרו, רח' יצחק שדה 8 , תל אביב 6777508  טל': 03-5197777 פקס: 03-7608421";
  worksheet.getCell(`A${startRow + 7}`).font = { name: style.fontName, size: 10, bold: true, color: { argb: style.border } };
  worksheet.getCell(`A${startRow + 7}`).alignment = { horizontal: 'center' };
  worksheet.getCell(`A${startRow + 8}`).value = 'ט.ל.ח';
  return startRow + 8;
}

function styleHebrewTemplateDetailRow(worksheet: ExcelJS.Worksheet, row: number, style: VisualStyle, warning: boolean) {
  worksheet.getRow(row).height = HEBREW_TEMPLATE_STYLE.rows.body;
  for (let column = 2; column <= 6; column += 1) {
    const cell = worksheet.getCell(row, column);
    cell.font = { name: style.fontName, size: style.bodySize, bold: true, color: { argb: style.border } };
    cell.alignment = { horizontal: 'center', ...(column === 2 ? { readingOrder: 'rtl' as const } : {}) };
    cell.border = {
      top: { style: 'thin', color: { argb: style.border } },
      bottom: { style: 'thin', color: { argb: style.border } },
      left: { style: column === 2 ? 'medium' : 'thin', color: { argb: style.border } },
      right: { style: column === 6 ? 'medium' : 'thin', color: { argb: style.border } },
    };
    if (warning) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.warningFill } };
  }
}

function writeHebrewRoomSection(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  night: CanonicalExportModel['nights'][number],
  labels: { section: string; description: string; rate: string; rooms: string; nights: string; total: string; beforeVat: string; includingVat: string },
  style: VisualStyle,
): { includingVatRow: number; nextRow: number } {
  worksheet.mergeCells(`B${startRow}:F${startRow}`);
  worksheet.getCell(`B${startRow}`).value = `${labels.section} · ${night.reportDate}`;
  worksheet.getRow(startRow).height = HEBREW_TEMPLATE_STYLE.rows.section;
  styleMergedRow(worksheet, startRow, 2, 6, styleHebrewSection, style);

  const headerRow = startRow + 1;
  const headers = [labels.description, labels.rate, labels.rooms, labels.nights, labels.total];
  headers.forEach((value, index) => {
    const cell = worksheet.getCell(headerRow, index + 2);
    cell.value = value;
    styleHebrewHeader(cell, style, index === 0, index === headers.length - 1);
  });
  worksheet.getRow(headerRow).height = HEBREW_TEMPLATE_STYLE.rows.header;

  const firstDetailRow = headerRow + 1;
  night.roomCharges.forEach((charge, index) => writeHebrewChargeRow(worksheet, firstDetailRow + index, charge, style));
  const lastDetailRow = firstDetailRow + night.roomCharges.length - 1;
  const subtotalRow = firstDetailRow + night.roomCharges.length;
  const detailRange = firstDetailRow <= lastDetailRow ? `F${firstDetailRow}:F${lastDetailRow}` : null;
  const subtotalFormula = detailRange
    ? `=IF(COUNTIF(${detailRange},"")>0,"",SUM(${detailRange}))`
    : '=""';
  writeHebrewTotalRow(worksheet, subtotalRow, labels.beforeVat, subtotalFormula, style.subtotalFill, style, 'subtotal');

  const includingVatRow = subtotalRow + 1;
  writeHebrewTotalRow(worksheet, includingVatRow, labels.includingVat, `=IF(F${subtotalRow}="","",F${subtotalRow}*1.18)`, HEBREW_TEMPLATE_STYLE.colors.header, style, 'includingVat');

  return { includingVatRow, nextRow: includingVatRow + 2 };
}

function writeHebrewTemplateHeader(
  worksheet: ExcelJS.Worksheet,
  model: CanonicalExportModel,
  labels: { documentDate: string; recipient: string; group: string; hotel: string; hostingDate: string; booking: string },
  style: VisualStyle,
) {
  worksheet.getRow(4).height = HEBREW_TEMPLATE_STYLE.rows.metadataCompact;
  worksheet.getCell('B4').value = labels.documentDate;
  worksheet.getCell('F4').value = labels.recipient;
  styleHebrewHeaderEdgeCell(worksheet.getCell('B4'), style);
  styleHebrewHeaderEdgeCell(worksheet.getCell('F4'), style);
  styleHebrewHeaderBottomCell(worksheet.getCell('B5'), style, true);
  styleHebrewHeaderBottomCell(worksheet.getCell('F5'), style, false);

  worksheet.getRow(5).height = HEBREW_TEMPLATE_STYLE.rows.draft;
  worksheet.getRow(9).height = HEBREW_TEMPLATE_STYLE.rows.metadata;
  worksheet.mergeCells('C9:E9');
  for (let column = 3; column <= 5; column += 1) {
    const cell = worksheet.getCell(9, column);
    cell.font = { name: style.fontName, size: 14, color: { argb: style.border } };
    cell.alignment = { horizontal: 'center', readingOrder: 'rtl' };
  }

  writeHebrewHeaderField(worksheet, 10, labels.group, model.metadata.groupName, style, true, 16);
  writeHebrewHeaderField(worksheet, 11, labels.hotel, model.metadata.hotelName ?? '', style, false, 14);
  writeHebrewHeaderField(worksheet, 12, labels.hostingDate, formatHebrewHostingDate(model), style, false, 14);
  writeHebrewHeaderField(worksheet, 13, labels.booking, '', style, false, 14, true);
  worksheet.getRow(14).height = HEBREW_TEMPLATE_STYLE.rows.metadataCompact;
}

function writeHebrewHeaderField(
  worksheet: ExcelJS.Worksheet,
  row: number,
  label: string,
  value: string,
  style: VisualStyle,
  highlighted: boolean,
  valueSize: number,
  last = false,
) {
  worksheet.getRow(row).height = highlighted ? HEBREW_TEMPLATE_STYLE.rows.title : HEBREW_TEMPLATE_STYLE.rows.metadata;
  worksheet.getCell(`B${row}`).value = label;
  worksheet.mergeCells(`C${row}:F${row}`);
  worksheet.getCell(`C${row}`).value = value;
  const bottom = last ? 'medium' : 'thin';
  const fill = highlighted ? { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: HEBREW_TEMPLATE_STYLE.colors.header }, bgColor: { argb: HEBREW_TEMPLATE_STYLE.colors.headerBackground } } : undefined;
  worksheet.getCell(`B${row}`).font = { name: style.fontName, size: 12, bold: true, color: { argb: style.border } };
  worksheet.getCell(`B${row}`).alignment = { horizontal: 'right' };
  if (fill) worksheet.getCell(`B${row}`).fill = fill;
  worksheet.getCell(`B${row}`).border = { top: { style: highlighted ? 'medium' : 'thin', color: { argb: style.border } }, bottom: { style: bottom, color: { argb: style.border } }, left: { style: 'medium', color: { argb: style.border } }, right: { style: 'thin', color: { argb: style.border } } };
  for (let column = 3; column <= 6; column += 1) {
    const cell = worksheet.getCell(row, column);
    cell.font = { name: style.fontName, size: valueSize, bold: true, color: { argb: style.border } };
    cell.alignment = { horizontal: 'center' };
    if (fill) cell.fill = fill;
    cell.border = { top: { style: highlighted ? 'medium' : 'thin', color: { argb: style.border } }, bottom: { style: bottom, color: { argb: style.border } }, left: { style: 'thin', color: { argb: style.border } }, right: { style: 'medium', color: { argb: style.border } } };
  }
}

function styleHebrewHeaderEdgeCell(cell: ExcelJS.Cell, style: VisualStyle) {
  cell.font = { name: style.fontName, size: 12, bold: true, color: { argb: style.border } };
  cell.alignment = { horizontal: 'center' };
  cell.border = { top: { style: 'medium', color: { argb: style.border } }, bottom: { style: 'thin', color: { argb: style.border } }, left: { style: 'medium', color: { argb: style.border } }, right: { style: 'medium', color: { argb: style.border } } };
}

function styleHebrewHeaderBottomCell(cell: ExcelJS.Cell, style: VisualStyle, topDivider: boolean) {
  cell.border = {
    ...(topDivider ? { top: { style: 'thin' as const, color: { argb: style.border } } } : {}),
    bottom: { style: 'medium', color: { argb: style.border } },
    left: { style: 'medium', color: { argb: style.border } },
    right: { style: 'medium', color: { argb: style.border } },
  };
}

function formatHebrewHostingDate(model: CanonicalExportModel): string {
  const checkIn = model.metadata.checkInDate;
  const checkOut = model.metadata.checkOutDate;
  if (!checkIn) return checkOut ?? '';
  if (!checkOut || checkIn === checkOut) return checkIn;
  return `${checkIn} - ${checkOut}`;
}

function writeHebrewChargeRow(worksheet: ExcelJS.Worksheet, row: number, charge: CanonicalRoomChargeRow, style: VisualStyle) {
  worksheet.getCell(`B${row}`).value = `${roomTypeLabel(charge.bookedRoomType, 'hebrew')} · ${occupancyLabel(charge.occupancyCategory, 'hebrew')}`;
  worksheet.getCell(`C${row}`).value = charge.currency === 'ILS' && charge.rate.kind === 'numeric' ? Number(charge.rate.value) : null;
  worksheet.getCell(`D${row}`).value = charge.roomCount;
  worksheet.getCell(`E${row}`).value = charge.nights;
  const amountFormula = charge.financialCompleteness === 'complete'
    ? `=IF(OR(NOT(ISNUMBER(C${row})),C${row}=""),"",D${row}*C${row}*E${row})`
    : '=""';
  worksheet.getCell(`F${row}`).value = { formula: amountFormula };
  for (let column = 2; column <= 6; column += 1) {
    const cell = worksheet.getCell(row, column);
    cell.font = { name: style.fontName, size: style.bodySize, bold: true, color: { argb: style.border } };
    cell.alignment = { horizontal: 'center', ...(column === 2 ? { readingOrder: 'rtl' as const } : {}), ...(String(worksheet.getCell(`B${row}`).value ?? '').length > 28 ? { wrapText: true } : {}) };
    cell.border = {
      top: { style: 'medium', color: { argb: style.border } },
      bottom: { style: 'medium', color: { argb: style.border } },
      left: { style: column === 2 ? 'medium' : 'thin', color: { argb: style.border } },
      right: { style: column === 6 ? 'medium' : 'thin', color: { argb: style.border } },
    };
  }
  worksheet.getRow(row).height = String(worksheet.getCell(`B${row}`).value ?? '').length > 28
    ? HEBREW_TEMPLATE_STYLE.rows.wrappedBody
    : HEBREW_TEMPLATE_STYLE.rows.body;
  if (charge.financialCompleteness === 'incomplete') worksheet.getCell(`B${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.warningFill } };
  worksheet.getCell(`C${row}`).numFmt = HEBREW_TEMPLATE_STYLE.numberFormats.currency;
  worksheet.getCell(`F${row}`).numFmt = HEBREW_TEMPLATE_STYLE.numberFormats.currency;
}

type HebrewTotalKind = 'subtotal' | 'includingVat' | 'combined';

function writeHebrewTotalRow(worksheet: ExcelJS.Worksheet, row: number, label: string, formula: string, fill: string | undefined, style: VisualStyle, kind: HebrewTotalKind) {
  worksheet.getRow(row).height = HEBREW_TEMPLATE_STYLE.rows.body;
  worksheet.mergeCells(`B${row}:E${row}`);
  worksheet.getCell(`B${row}`).value = label;
  worksheet.getCell(`F${row}`).value = { formula };
  for (let column = 2; column <= 5; column += 1) {
    const cell = worksheet.getCell(row, column);
    styleHebrewTotalLabel(cell, style, kind, fill);
  }
  const value = worksheet.getCell(`F${row}`);
  styleHebrewTotalValue(value, style, kind, fill);
  value.numFmt = HEBREW_TEMPLATE_STYLE.numberFormats.currency;
}

async function buildEnglishUsdWorkbook(model: CanonicalExportModel, targetCurrency: 'USD' | 'ILS'): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hotel Breakdown V1';
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  const worksheet = workbook.addWorksheet('גיליון1', {
    views: [{ rightToLeft: true, showGridLines: true, showRuler: true, showRowColHeaders: true, zoomScale: 100 }],
    pageSetup: { orientation: 'portrait', ...ENGLISH_TEMPLATE_STYLE.pageSetup },
  });
  worksheet.pageSetup.margins = ENGLISH_TEMPLATE_STYLE.print;
  worksheet.properties.defaultRowHeight = ENGLISH_TEMPLATE_STYLE.rows.default;
  worksheet.columns = [
    { width: ENGLISH_TEMPLATE_STYLE.columns.a },
    { width: ENGLISH_TEMPLATE_STYLE.columns.b },
    { width: ENGLISH_TEMPLATE_STYLE.columns.c },
    { width: ENGLISH_TEMPLATE_STYLE.columns.d },
    { width: ENGLISH_TEMPLATE_STYLE.columns.e },
    { width: ENGLISH_TEMPLATE_STYLE.columns.f },
  ];
  const englishLogo = await loadEnglishLogo();
  const logoId = workbook.addImage({ buffer: englishLogo, extension: 'jpeg' });
  worksheet.addImage(logoId, ENGLISH_TEMPLATE_STYLE.imageRange as unknown as ExcelJS.ImageRange);

  writeEnglishHeader(worksheet, model);

  let row = 14;
  const roomTotalRefs: string[] = [];
  for (const night of model.nights) {
    const section = writeEnglishRoomSection(worksheet, row, night, targetCurrency);
    roomTotalRefs.push(`F${section.totalRow}`);
    row = section.nextRow;
  }

  const combinedRoomRow = row;
  writeEnglishCombinedRow(worksheet, combinedRoomRow, ` Total Room charges in ${targetCurrency}`, roomTotalRefs.length ? `=IF(OR(${roomTotalRefs.map((ref) => `${ref}=""`).join(',')}),"",SUM(${roomTotalRefs.join(',')}))` : '=""');
  row = combinedRoomRow + 2;

  const staff = writeEnglishStaffSection(worksheet, row, model, targetCurrency);
  const finalComponents = [
    model.nights.length > 0 ? `F${combinedRoomRow}` : null,
    (model.complimentaryStaff?.length ?? 0) > 0 ? `F${staff.totalRow}` : null,
    `F${staff.vatRow}`,
    `F${staff.porterageRow}`,
  ].filter((reference): reference is string => reference !== null);
  worksheet.getCell(`F${staff.roomsLabelRow}`).value = {
    formula: `=IF(OR(${finalComponents.map((reference) => `${reference}=""`).join(',')}),"",SUM(${finalComponents.join(',')}))`,
  };
  row = staff.nextRow;
  const ancillary = writeEnglishAncillarySection(worksheet, row, model, targetCurrency);
  row = ancillary.nextRow;
  worksheet.pageSetup.printArea = `A1:G${row}`;
  return workbook;
}

function writeEnglishHeader(worksheet: ExcelJS.Worksheet, model: CanonicalExportModel) {
  worksheet.getRow(3).height = ENGLISH_TEMPLATE_STYLE.rows.issueDate;
  writeEnglishHeaderLabel(worksheet.getCell('B3'), 'Issue Date', 'top');
  writeEnglishHeaderLabel(worksheet.getCell('F3'), 'To', 'top');
  for (const address of ['B4', 'F4']) {
    const cell = worksheet.getCell(address);
    cell.font = { name: 'Times New Roman', bold: true, size: 12 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { left: ENGLISH_TEMPLATE_STYLE.border, right: ENGLISH_TEMPLATE_STYLE.border, top: { style: 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, bottom: ENGLISH_TEMPLATE_STYLE.border };
  }
  worksheet.mergeCells('C6:E6');
  worksheet.mergeCells('B8:E8');
  worksheet.mergeCells('B9:E9');
  worksheet.mergeCells('B10:E10');
  worksheet.mergeCells('B11:E11');
  worksheet.mergeCells('B12:E12');
  const values: Record<number, string> = {
    8: model.metadata.groupName,
    9: model.metadata.hotelName ?? '',
    10: model.metadata.reportDates.join(', '),
    11: '',
    12: '',
  };
  for (const row of [8, 9, 10, 11, 12]) {
    const value = worksheet.getCell(`B${row}`);
    value.value = values[row];
    value.font = { name: 'Times New Roman', bold: row === 9, size: row === 9 ? 14 : 12 };
    value.alignment = { horizontal: 'center', vertical: 'middle' };
    const bottom = row === 12 ? ENGLISH_TEMPLATE_STYLE.border.style : 'thin';
    value.border = { left: ENGLISH_TEMPLATE_STYLE.border, top: row === 8 ? ENGLISH_TEMPLATE_STYLE.border : { style: 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, bottom: { style: bottom, color: ENGLISH_TEMPLATE_STYLE.border.color } };
    for (let column = 3; column <= 5; column += 1) {
      worksheet.getCell(row, column).font = value.font;
      worksheet.getCell(row, column).alignment = value.alignment;
      worksheet.getCell(row, column).border = { top: { style: row === 8 ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, bottom: { style: bottom, color: ENGLISH_TEMPLATE_STYLE.border.color } };
    }
  }
  const groupLabel = worksheet.getCell('F8');
  const labels: Record<string, string> = { F8: 'Group name', F9: 'Hotel', F10: 'Dates', F11: 'PM', F12: 'Agent' };
  for (const address of Object.keys(labels)) {
    const cell = worksheet.getCell(address);
    cell.value = labels[address];
    cell.font = { name: 'Times New Roman', bold: true, size: 12 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    const numericRow = Number(address.slice(1));
    const bottom = numericRow === 12 ? 'medium' : 'thin';
    cell.border = { left: { style: 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, right: ENGLISH_TEMPLATE_STYLE.border, top: { style: numericRow === 8 ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, bottom: { style: bottom, color: ENGLISH_TEMPLATE_STYLE.border.color } };
  }
  for (const row of [8, 9, 10, 11, 12]) {
    worksheet.getCell(`B${row}`).border = { ...worksheet.getCell(`B${row}`).border, left: ENGLISH_TEMPLATE_STYLE.border };
    worksheet.getCell(`E${row}`).border = { ...worksheet.getCell(`E${row}`).border, right: { style: row === 8 ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color } };
    worksheet.getCell(`F${row}`).border = { ...worksheet.getCell(`F${row}`).border, left: { style: row === 8 ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, right: { style: row === 8 ? 'thin' : 'medium', color: ENGLISH_TEMPLATE_STYLE.border.color } };
  }
  worksheet.getCell('B8').fill = englishThemeFill(4, ENGLISH_TEMPLATE_STYLE.colors.overallTint);
  for (let column = 3; column <= 6; column += 1) worksheet.getCell(8, column).fill = englishThemeFill(4, ENGLISH_TEMPLATE_STYLE.colors.overallTint);
  worksheet.getRow(4).height = ENGLISH_TEMPLATE_STYLE.rows.headerValue;
  worksheet.getRow(5).height = ENGLISH_TEMPLATE_STYLE.rows.default;
  worksheet.getRow(6).height = ENGLISH_TEMPLATE_STYLE.rows.metadata;
  worksheet.getRow(7).height = ENGLISH_TEMPLATE_STYLE.rows.metadata;
  worksheet.getRow(8).height = ENGLISH_TEMPLATE_STYLE.rows.group;
  worksheet.getRow(9).height = ENGLISH_TEMPLATE_STYLE.rows.metadata;
  worksheet.getRow(10).height = ENGLISH_TEMPLATE_STYLE.rows.issueDate;
  worksheet.getRow(11).height = ENGLISH_TEMPLATE_STYLE.rows.issueDate;
  worksheet.getRow(12).height = 16.5;
  worksheet.getRow(13).height = ENGLISH_TEMPLATE_STYLE.rows.headerValue;
  void groupLabel;
}

function writeEnglishHeaderLabel(cell: ExcelJS.Cell, value: string, position: 'top') {
  cell.value = value;
  cell.font = { name: 'Times New Roman', bold: true, size: 12 };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = { left: ENGLISH_TEMPLATE_STYLE.border, right: ENGLISH_TEMPLATE_STYLE.border, top: ENGLISH_TEMPLATE_STYLE.border, bottom: { style: 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color } };
  void position;
}

function writeEnglishRoomSection(worksheet: ExcelJS.Worksheet, startRow: number, night: CanonicalNight, targetCurrency: 'USD' | 'ILS'): { totalRow: number; nextRow: number } {
  worksheet.mergeCells(`B${startRow}:F${startRow}`);
  styleEnglishSectionRow(worksheet, startRow, 'rooms breakdon');
  const headerRow = startRow + 1;
  [`Occupancy`, `no. of rooms`, `cost`, `night`, `Total in ${targetCurrency === 'USD' ? '$' : targetCurrency}`].forEach((value, index) => styleEnglishTableCell(worksheet.getCell(headerRow, index + 2), value, 'header', index === 0, index === 4));
  worksheet.getRow(headerRow).height = ENGLISH_TEMPLATE_STYLE.rows.tableHeader;
  const firstDetailRow = startRow + 2;
  night.roomCharges.forEach((charge, index) => writeEnglishRoomDetail(worksheet, firstDetailRow + index, charge, targetCurrency));
  const detailCount = night.roomCharges.length;
  const totalRow = firstDetailRow + detailCount;
  writeEnglishSubtotalRow(worksheet, totalRow, ' Total Room charges', detailCount ? `=IF(COUNTIF(F${firstDetailRow}:F${totalRow - 1},"")>0,"",SUM(F${firstDetailRow}:F${totalRow - 1}))` : '=""');
  return { totalRow, nextRow: totalRow + 2 };
}

function writeEnglishRoomDetail(worksheet: ExcelJS.Worksheet, row: number, charge: CanonicalRoomChargeRow, targetCurrency: 'USD' | 'ILS') {
  const complete = charge.financialCompleteness === 'complete' && charge.currency === targetCurrency && charge.rate.kind === 'numeric';
  const rate = charge.rate.kind === 'numeric' ? Number(charge.rate.value) : null;
  styleEnglishDetailRow(worksheet, row, `${roomTypeLabel(charge.bookedRoomType, 'usd')} · ${occupancyLabel(charge.occupancyCategory, 'usd')}`, charge.roomCount, complete ? rate : null, charge.nights, `=IF(OR(NOT(ISNUMBER(D${row})),D${row}=""),"",C${row}*D${row}*E${row})`);
}

function styleEnglishSectionRow(worksheet: ExcelJS.Worksheet, row: number, value: string, fontSize = 14, rowHeight: number = ENGLISH_TEMPLATE_STYLE.rows.section) {
  worksheet.getRow(row).height = rowHeight;
  for (let column = 2; column <= 6; column += 1) {
    const cell = worksheet.getCell(row, column);
    cell.value = column === 2 ? value : cell.value;
    cell.font = { name: 'Times New Roman', bold: true, size: fontSize };
    cell.fill = englishThemeFill(5, ENGLISH_TEMPLATE_STYLE.colors.sectionTint);
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { left: { style: column === 2 ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, right: { style: column === 6 ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, top: ENGLISH_TEMPLATE_STYLE.border, bottom: ENGLISH_TEMPLATE_STYLE.border };
  }
}

function styleEnglishTableCell(cell: ExcelJS.Cell, value: string, kind: 'header', first: boolean, last: boolean) {
  cell.value = value;
  cell.font = { name: 'Times New Roman', bold: true, size: 11 };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = { left: { style: first ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, right: { style: last ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, top: ENGLISH_TEMPLATE_STYLE.border, bottom: { style: 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color } };
  void kind;
}

function styleEnglishDetailRow(worksheet: ExcelJS.Worksheet, row: number, description: string, rooms: number, cost: number | null, night: number, formula: string) {
  const values = [description, rooms, cost, night, { formula }];
  worksheet.getRow(row).height = ENGLISH_TEMPLATE_STYLE.rows.detail;
  values.forEach((value, index) => {
    const cell = worksheet.getCell(row, index + 2);
    cell.value = value;
    cell.font = { name: 'Times New Roman', bold: true, size: 11 };
    cell.fill = englishThemeFill(0, 0);
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { left: { style: index === 0 ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, right: { style: index === 4 ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, top: { style: 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, bottom: { style: 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color } };
  });
  worksheet.getCell(`D${row}`).numFmt = ENGLISH_TEMPLATE_STYLE.numberFormats.usd;
  worksheet.getCell(`F${row}`).numFmt = ENGLISH_TEMPLATE_STYLE.numberFormats.usd;
}

function writeEnglishSubtotalRow(worksheet: ExcelJS.Worksheet, row: number, label: string, formula: string) {
  worksheet.getRow(row).height = ENGLISH_TEMPLATE_STYLE.rows.subtotal;
  const values = [label, null, null, null, { formula }];
  values.forEach((value, index) => {
    const cell = worksheet.getCell(row, index + 2);
    cell.value = value;
    cell.font = { name: 'Times New Roman', bold: true, size: 11 };
    cell.fill = englishThemeFill(5, 0.7999816888943144);
    cell.alignment = { horizontal: index === 0 ? 'center' : 'center', vertical: 'middle' };
    cell.border = { left: { style: index === 0 ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, right: { style: index === 4 ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, top: { style: 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, bottom: ENGLISH_TEMPLATE_STYLE.border };
  });
  worksheet.getCell(`F${row}`).numFmt = ENGLISH_TEMPLATE_STYLE.numberFormats.usd;
}

function writeEnglishCombinedRow(worksheet: ExcelJS.Worksheet, row: number, label: string, formula: string) {
  worksheet.getRow(row).height = ENGLISH_TEMPLATE_STYLE.rows.combined;
  worksheet.mergeCells(`B${row}:E${row}`);
  for (let column = 2; column <= 6; column += 1) {
    const cell = worksheet.getCell(row, column);
    if (column === 2) cell.value = label;
    cell.font = { name: 'Times New Roman', bold: true, size: 12 };
    cell.fill = englishThemeFill(4, ENGLISH_TEMPLATE_STYLE.colors.overallTint);
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { left: { style: column === 2 ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, right: { style: column === 6 ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, top: ENGLISH_TEMPLATE_STYLE.border, bottom: ENGLISH_TEMPLATE_STYLE.border };
  }
  worksheet.getCell(`F${row}`).value = { formula };
  worksheet.getCell(`F${row}`).numFmt = ENGLISH_TEMPLATE_STYLE.numberFormats.usdAccounting;
}

function writeEnglishStaffSection(worksheet: ExcelJS.Worksheet, startRow: number, model: CanonicalExportModel, targetCurrency: 'USD' | 'ILS'): { nextRow: number; totalRow: number; vatRow: number; porterageRow: number; roomsLabelRow: number } {
  worksheet.mergeCells(`B${startRow}:F${startRow}`);
  styleEnglishSectionRow(worksheet, startRow, 'Free and Staff', 12, ENGLISH_TEMPLATE_STYLE.rows.staffHeader);
  const headerRow = startRow + 1;
  [['D', 'מחיר'], ['E', 'כמות'], ['F', 'סה"כ']].forEach(([column, value]) => {
    const cell = worksheet.getCell(`${column}${headerRow}`);
    cell.value = value;
  });
  for (let column = 2; column <= 6; column += 1) styleEnglishStaffHeaderCell(worksheet.getCell(headerRow, column), column === 2, column === 6);
  worksheet.getRow(headerRow).height = ENGLISH_TEMPLATE_STYLE.rows.staffTableHeader;
  const firstRow = startRow + 2;
  const entries = model.complimentaryStaff ?? [];
  entries.forEach((charge, index) => writeEnglishStaffDetail(worksheet, firstRow + index, charge, targetCurrency));
  const totalRow = firstRow + entries.length;
  writeEnglishStaffTotal(worksheet, totalRow, entries.length ? `=IF(COUNTIF(F${firstRow}:F${totalRow - 1},"")>0,"",SUM(F${firstRow}:F${totalRow - 1}))` : '=""');
  const vatRow = totalRow + 2;
  const porterageRow = vatRow + 2;
  writeEnglishUnsupportedStaffRow(worksheet, vatRow, 'vat staff', englishThemeFill(7, 0.5999938962981048), {
    formula: `=IF(OR(NOT(ISNUMBER(C${vatRow})),NOT(ISNUMBER(D${vatRow})),NOT(ISNUMBER(E${vatRow}))),"",C${vatRow}*D${vatRow}*E${vatRow})`,
    unitValue: 1,
    numberFormat: ENGLISH_TEMPLATE_STYLE.numberFormats.usdAccounting,
  });
  writeEnglishUnsupportedStaffRow(worksheet, porterageRow, 'Porterage', englishThemeFill(5, 0.7999816888943144), {
    formula: `=IF(OR(NOT(ISNUMBER(C${porterageRow})),NOT(ISNUMBER(D${porterageRow}))),"",C${porterageRow}*D${porterageRow})`,
    labelOnlyFill: true,
  });
  const roomsLabelRow = porterageRow + 2;
  writeEnglishUnsupportedSummaryRow(worksheet, roomsLabelRow, 'Toal rooms is USD');
  return { nextRow: roomsLabelRow + 2, totalRow, vatRow, porterageRow, roomsLabelRow };
}

function styleEnglishStaffHeaderCell(cell: ExcelJS.Cell, first: boolean, last: boolean) {
  cell.font = { name: 'Times New Roman', bold: true, size: 12 };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = { left: { style: first ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, right: { style: last ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, bottom: { style: 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color } };
}

function writeEnglishStaffDetail(worksheet: ExcelJS.Worksheet, row: number, charge: NonNullable<CanonicalExportModel['complimentaryStaff']>[number], targetCurrency: 'USD' | 'ILS') {
  const complete = charge.completeness === 'complete' && charge.currency === targetCurrency && charge.amount.kind === 'numeric' && charge.number.kind === 'numeric';
  const amount = charge.amount.kind === 'numeric' ? Number(charge.amount.value) : null;
  const number = charge.number.kind === 'numeric' ? Number(charge.number.value) : 0;
  styleEnglishDetailRow(worksheet, row, charge.type === 'free' ? 'Free' : 'Staff', number, complete ? amount : null, 1, `=IF(OR(NOT(ISNUMBER(C${row})),NOT(ISNUMBER(D${row})),NOT(ISNUMBER(E${row}))),"",C${row}*D${row}*E${row})`);
  worksheet.getCell(`D${row}`).numFmt = ENGLISH_TEMPLATE_STYLE.numberFormats.usd;
}

function writeEnglishStaffTotal(worksheet: ExcelJS.Worksheet, row: number, formula: string) {
  worksheet.getCell(`B${row}`).value = 'Total';
  worksheet.getCell(`F${row}`).value = { formula };
  for (let column = 2; column <= 6; column += 1) {
    const cell = worksheet.getCell(row, column);
    cell.font = { name: 'Times New Roman', bold: true, size: 11 };
    cell.fill = englishThemeFill(5, 0.7999816888943144);
    cell.alignment = { horizontal: column === 2 ? 'right' : 'center', vertical: 'middle' };
    cell.border = { left: { style: column === 2 ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, right: { style: column === 6 ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, top: { style: 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, bottom: ENGLISH_TEMPLATE_STYLE.border };
  }
  worksheet.getRow(row).height = ENGLISH_TEMPLATE_STYLE.rows.subtotal;
  worksheet.getCell(`F${row}`).numFmt = ENGLISH_TEMPLATE_STYLE.numberFormats.usd;
}

function writeEnglishUnsupportedStaffRow(worksheet: ExcelJS.Worksheet, row: number, label: string, fill: ExcelJS.Fill, options: { formula: string; unitValue?: number; numberFormat?: string; labelOnlyFill?: boolean }) {
  worksheet.getCell(`B${row}`).value = label;
  styleEnglishDetailRow(worksheet, row, label, 0, null, 1, '=""');
  worksheet.getCell(`B${row}`).value = label;
  worksheet.getCell(`C${row}`).value = null;
  worksheet.getCell(`D${row}`).value = null;
  worksheet.getCell(`E${row}`).value = null;
  worksheet.getCell(`F${row}`).value = { formula: options.formula };
  if (options.unitValue !== undefined) worksheet.getCell(`E${row}`).value = options.unitValue;
  for (let column = 2; column <= 6; column += 1) {
    const cell = worksheet.getCell(row, column);
    if (!options.labelOnlyFill || column === 2) cell.fill = fill;
    cell.border = { left: { style: column === 2 ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, right: { style: column === 6 ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, top: ENGLISH_TEMPLATE_STYLE.border, bottom: ENGLISH_TEMPLATE_STYLE.border };
  }
  if (options.numberFormat) {
    worksheet.getCell(`D${row}`).numFmt = options.numberFormat;
    worksheet.getCell(`F${row}`).numFmt = options.numberFormat;
  }
}

function writeEnglishUnsupportedSummaryRow(worksheet: ExcelJS.Worksheet, row: number, label: string) {
  worksheet.getRow(row).height = ENGLISH_TEMPLATE_STYLE.rows.staffHeader;
  worksheet.mergeCells(`B${row}:E${row}`);
  worksheet.getCell(`B${row}`).value = label;
  for (let column = 2; column <= 6; column += 1) {
    const cell = worksheet.getCell(row, column);
    cell.fill = englishThemeFill(4, ENGLISH_TEMPLATE_STYLE.colors.overallTint);
    cell.font = { name: 'Times New Roman', bold: true, size: 12 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { left: { style: column === 2 ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, right: { style: column === 6 ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, top: ENGLISH_TEMPLATE_STYLE.border, bottom: ENGLISH_TEMPLATE_STYLE.border };
  }
  worksheet.getCell(`F${row}`).numFmt = ENGLISH_TEMPLATE_STYLE.numberFormats.usdAccounting;
}

function writeEnglishAncillarySection(worksheet: ExcelJS.Worksheet, startRow: number, model: CanonicalExportModel, targetCurrency: 'USD' | 'ILS'): { nextRow: number } {
  worksheet.mergeCells(`B${startRow}:F${startRow}`);
  styleEnglishSectionRow(worksheet, startRow, 'Extrot in Nis', 12, ENGLISH_TEMPLATE_STYLE.rows.ancillary);
  const headerRow = startRow + 1;
  ['', 'cost', 'no. of pax', '', 'Total'].forEach((value, index) => styleEnglishAncillaryHeaderCell(worksheet.getCell(headerRow, index + 2), value, index === 0, index === 4));
  worksheet.getRow(headerRow).height = ENGLISH_TEMPLATE_STYLE.rows.ancillary;
  const firstRow = startRow + 2;
  const entries = model.additionalCharges ?? [];
  entries.forEach((charge, index) => writeEnglishAncillaryDetail(worksheet, firstRow + index, charge, targetCurrency));
  if (entries.length > 0) {
    for (let column = 2; column <= 6; column += 1) {
      worksheet.getCell(firstRow, column).border = { ...worksheet.getCell(firstRow, column).border, top: ENGLISH_TEMPLATE_STYLE.border };
    }
  }
  const finalRow = firstRow + entries.length;
  const formula = entries.length ? `=IF(COUNTIF(F${firstRow}:F${finalRow - 1},"")>0,"",SUM(F${firstRow}:F${finalRow - 1}))` : '=""';
  worksheet.mergeCells(`B${finalRow}:E${finalRow}`);
  worksheet.getCell(`B${finalRow}`).value = 'Total Extrot in Nis';
  worksheet.getCell(`F${finalRow}`).value = { formula };
  styleEnglishAncillaryTotal(worksheet, finalRow, true, ancillaryNumberFormat(entries));
  return { nextRow: finalRow };
}

function styleEnglishAncillaryHeaderCell(cell: ExcelJS.Cell, value: string, first: boolean, last: boolean) {
  cell.value = value;
  cell.font = { name: 'Times New Roman', bold: true, size: 12 };
  cell.fill = { type: 'pattern', pattern: 'none' };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = { left: { style: first ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, right: { style: last ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, top: ENGLISH_TEMPLATE_STYLE.border };
}

function writeEnglishAncillaryDetail(worksheet: ExcelJS.Worksheet, row: number, charge: NonNullable<CanonicalExportModel['additionalCharges']>[number], targetCurrency: 'USD' | 'ILS') {
  const complete = charge.financialCompleteness === 'complete' && (charge.currency === 'ILS' || charge.currency === targetCurrency) && charge.price.kind === 'numeric' && charge.quantity.kind === 'numeric' && charge.number.kind === 'numeric';
  const price = charge.price.kind === 'numeric' ? Number(charge.price.value) : null;
  const quantity = charge.quantity.kind === 'numeric' ? Number(charge.quantity.value) : null;
  const number = charge.number.kind === 'numeric' ? Number(charge.number.value) : null;
  styleEnglishDetailRow(worksheet, row, charge.description || 'Unresolved description', complete && quantity !== null ? quantity : 0, complete ? price : null, complete && number !== null ? number : 0, complete ? `=IF(OR(NOT(ISNUMBER(C${row})),NOT(ISNUMBER(D${row})),NOT(ISNUMBER(E${row}))),"",C${row}*D${row}*E${row})` : '=""');
  worksheet.getCell(`C${row}`).value = complete ? price : null;
  worksheet.getCell(`D${row}`).value = complete ? quantity : null;
  worksheet.getCell(`E${row}`).value = complete ? number : null;
  const numberFormat = charge.currency === 'ILS' ? ENGLISH_TEMPLATE_STYLE.numberFormats.ils : ENGLISH_TEMPLATE_STYLE.numberFormats.usd;
  worksheet.getCell(`C${row}`).numFmt = numberFormat;
  worksheet.getCell(`F${row}`).numFmt = numberFormat;
}

function ancillaryNumberFormat(entries: NonNullable<CanonicalExportModel['additionalCharges']>): string {
  return entries.length > 0 && entries.every((entry) => entry.currency === 'ILS') ? ENGLISH_TEMPLATE_STYLE.numberFormats.ils : ENGLISH_TEMPLATE_STYLE.numberFormats.usd;
}

function styleEnglishAncillaryTotal(worksheet: ExcelJS.Worksheet, row: number, grand: boolean, numberFormat: string) {
  worksheet.getRow(row).height = ENGLISH_TEMPLATE_STYLE.rows.ancillary;
  for (let column = 2; column <= 6; column += 1) {
    const cell = worksheet.getCell(row, column);
    cell.font = { name: 'Times New Roman', bold: true, size: 12 };
    cell.fill = grand ? englishThemeFill(4, ENGLISH_TEMPLATE_STYLE.colors.overallTint) : { type: 'pattern', pattern: 'none' };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { left: { style: column === 2 ? 'thin' : 'medium', color: ENGLISH_TEMPLATE_STYLE.border.color }, right: { style: column === 6 ? 'medium' : 'thin', color: ENGLISH_TEMPLATE_STYLE.border.color }, top: grand ? undefined : ENGLISH_TEMPLATE_STYLE.border, bottom: grand ? ENGLISH_TEMPLATE_STYLE.border : undefined };
  }
  worksheet.getCell(`F${row}`).numFmt = numberFormat;
}

function englishThemeFill(theme: number, tint: number) {
  return { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { theme, tint }, bgColor: ENGLISH_INDEXED_WHITE };
}

async function loadEnglishLogo(): Promise<ArrayBuffer | Uint8Array> {
  try {
    const response = await fetch(ENGLISH_LOGO_URL);
    if (response.ok) return response.arrayBuffer();
  } catch {
    // Node/Vitest does not serve Vite asset URLs; use the same checked-in asset directly.
  }
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  return readFile(join(process.cwd(), 'src', 'infrastructure', 'export', 'isrotelLogo.jpg'));
}

async function buildWorkbook(model: CanonicalExportModel, language: ExportLanguage, targetCurrency: 'USD' | 'ILS' = 'USD'): Promise<ExcelJS.Workbook> {
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
    : { title: 'Hotel Breakdown', group: 'Group name', hotel: 'Hotel', dates: 'Dates', checkIn: 'Check-in', checkOut: 'Check-out', currency: 'Currency', roomCharges: 'rooms breakdon', description: 'Occupancy', rooms: 'no. of rooms', rate: 'cost', nights: 'night', beforeVat: '', vat: '', total: `Total in ${targetCurrency}`, nightly: 'Total Room charges', overall: `Total Room charges in ${targetCurrency}`, summary: 'Summary', draft: 'DRAFT' };

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
  worksheet.getCell('C7').value = targetCurrency;
  worksheet.getCell('B8').value = labels.checkIn;
  worksheet.getCell('C8').value = model.metadata.checkInDate ?? '—';
  worksheet.getCell('D8').value = labels.checkOut;
  worksheet.getCell('E8').value = model.metadata.checkOutDate ?? '—';
  for (const address of ['B4', 'B5', 'B6', 'B7', 'B8', 'D8']) styleMetadataLabel(worksheet.getCell(address), style);
  for (const address of ['C4', 'C5', 'C6', 'C7', 'C8', 'E8']) styleMetadataValue(worksheet.getCell(address), style);

  let row = 10;
  const detailTotalRefs: string[] = [];
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
  if (model.additionalCharges?.length) {
    row += 2;
    row = writeAdditionalChargesSection(worksheet, row, model, language, targetCurrency, style, lastColumn);
  }
  if (model.complimentaryStaff?.length) {
    row += 2;
    row = writeComplimentaryStaffSection(worksheet, row, model, language, targetCurrency, style, lastColumn);
  }
  worksheet.pageSetup.printArea = `A1:${columnLetter(lastColumn)}${row}`;
  return workbook;
}

function writeAdditionalChargesSection(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  model: CanonicalExportModel,
  language: ExportLanguage,
  targetCurrency: 'USD' | 'ILS',
  style: VisualStyle,
  lastColumn: number,
): number {
  worksheet.mergeCells(`B${startRow}:${columnLetter(lastColumn)}${startRow}`);
  worksheet.getCell(`B${startRow}`).value = language === 'hebrew' ? 'עלויות נוספות' : 'Additional Charges';
  styleMergedRow(worksheet, startRow, 2, lastColumn, styleSection, style);
  const headerRow = startRow + 1;
  const headers = language === 'hebrew'
    ? ['תיאור', 'מחיר', 'כמות', 'מספר', 'לפני מע״מ', 'מע״מ 18%', 'סה״כ']
    : ['Description', 'Price', 'Quantity', 'Number', 'Total'];
  headers.forEach((value, index) => {
    const cell = worksheet.getCell(headerRow, index + 2);
    cell.value = value;
    styleHeader(cell, style, index === 0, index === headers.length - 1);
  });
  const firstRow = headerRow + 1;
  model.additionalCharges?.forEach((charge, index) => {
    const row = firstRow + index;
    const beforeVatColumn = language === 'hebrew' ? 'F' : 'F';
    const totalColumn = language === 'hebrew' ? 'H' : 'F';
    worksheet.getCell(`B${row}`).value = `${charge.description || 'Unresolved description'}${charge.currency !== targetCurrency ? ` · ${charge.currency}` : ''}`;
    worksheet.getCell(`C${row}`).value = charge.currency === targetCurrency && charge.price.kind === 'numeric' ? Number(charge.price.value) : null;
    worksheet.getCell(`D${row}`).value = charge.quantity.kind === 'numeric' ? Number(charge.quantity.value) : null;
    worksheet.getCell(`E${row}`).value = charge.number.kind === 'numeric' ? Number(charge.number.value) : null;
    const complete = charge.financialCompleteness === 'complete' && charge.currency === targetCurrency;
    if (language === 'hebrew') {
      worksheet.getCell(`F${row}`).value = complete ? { formula: `=IF(OR(NOT(ISNUMBER(C${row})),NOT(ISNUMBER(D${row})),NOT(ISNUMBER(E${row}))),"",C${row}*D${row}*E${row})` } : { formula: '=""' };
      worksheet.getCell(`G${row}`).value = { formula: `=IF(F${row}="","",F${row}*18%)` };
      worksheet.getCell(`H${row}`).value = { formula: `=IF(F${row}="","",F${row}+G${row})` };
    } else {
      worksheet.getCell(totalColumn + row).value = complete ? { formula: `=IF(OR(NOT(ISNUMBER(C${row})),NOT(ISNUMBER(D${row})),NOT(ISNUMBER(E${row}))),"",C${row}*D${row}*E${row})` } : { formula: '=""' };
    }
    for (let column = 2; column <= lastColumn; column += 1) {
      const cell = worksheet.getCell(row, column);
      cell.font = { name: style.fontName, size: style.bodySize, color: { argb: style.border } };
      cell.alignment = { horizontal: 'center', ...(column === 2 && language === 'hebrew' ? { readingOrder: 'rtl' as const } : {}) };
      cell.border = { top: { style: 'thin', color: { argb: style.border } }, bottom: { style: 'thin', color: { argb: style.border } }, left: { style: column === 2 ? 'medium' : 'thin', color: { argb: style.border } }, right: { style: column === lastColumn ? 'medium' : 'thin', color: { argb: style.border } } };
      if (!complete) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.warningFill } };
    }
    if (language === 'hebrew') {
      for (const column of ['C', 'F', 'G', 'H']) worksheet.getCell(`${column}${row}`).numFmt = HEBREW_TEMPLATE_STYLE.numberFormats.currency;
    } else {
      worksheet.getCell(`C${row}`).numFmt = currencyNumberFormat(targetCurrency);
      worksheet.getCell(`F${row}`).numFmt = currencyNumberFormat(targetCurrency);
    }
  });
  const lastRow = firstRow + (model.additionalCharges?.length ?? 0) - 1;
  const totalRow = lastRow + 1;
  const totalColumn = language === 'hebrew' ? 'H' : 'F';
  worksheet.getCell(`B${totalRow}`).value = language === 'hebrew' ? 'סה״כ עלויות נוספות כולל מע״מ' : 'Total Additional Charges';
  styleSubtotalLabel(worksheet.getCell(`B${totalRow}`), style);
  worksheet.getCell(`${totalColumn}${totalRow}`).value = { formula: `=IF(COUNTIF(${totalColumn}${firstRow}:${totalColumn}${lastRow},"")>0,"",SUM(${totalColumn}${firstRow}:${totalColumn}${lastRow}))` };
  styleSubtotal(worksheet.getCell(`${totalColumn}${totalRow}`), style);
  return totalRow;
}

function writeComplimentaryStaffSection(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  model: CanonicalExportModel,
  language: ExportLanguage,
  targetCurrency: 'USD' | 'ILS',
  style: VisualStyle,
  lastColumn: number,
): number {
  worksheet.mergeCells(`B${startRow}:F${startRow}`);
  worksheet.getCell(`B${startRow}`).value = language === 'hebrew' ? 'Free & Staff' : 'Free & Staff';
  styleMergedRow(worksheet, startRow, 2, 6, styleSection, style);
  const headerRow = startRow + 1;
  ['Type', 'Amount', 'Number', 'Currency', 'Total'].forEach((value, index) => {
    const cell = worksheet.getCell(headerRow, index + 2);
    cell.value = value;
    styleHeader(cell, style, index === 0, index === 4);
  });
  const firstRow = headerRow + 1;
  model.complimentaryStaff?.forEach((charge, index) => writeComplimentaryStaffExcelRow(worksheet, firstRow + index, charge, language, targetCurrency, style));
  const lastRow = firstRow + (model.complimentaryStaff?.length ?? 0) - 1;
  const totalRow = lastRow + 1;
  worksheet.mergeCells(`B${totalRow}:E${totalRow}`);
  worksheet.getCell(`B${totalRow}`).value = 'Total Free & Staff';
  styleSubtotalLabel(worksheet.getCell(`B${totalRow}`), style);
  worksheet.getCell(`F${totalRow}`).value = { formula: `=IF(COUNTIF(F${firstRow}:F${lastRow},"")>0,"",SUM(F${firstRow}:F${lastRow}))` };
  styleSubtotal(worksheet.getCell(`F${totalRow}`), style);
  return totalRow;
}

function writeComplimentaryStaffExcelRow(
  worksheet: ExcelJS.Worksheet,
  row: number,
  charge: NonNullable<CanonicalExportModel['complimentaryStaff']>[number],
  language: ExportLanguage,
  targetCurrency: 'USD' | 'ILS',
  style: VisualStyle,
) {
  worksheet.getCell(`B${row}`).value = charge.type === 'free' ? 'Free' : 'Staff';
  worksheet.getCell(`C${row}`).value = charge.currency === targetCurrency && charge.amount.kind === 'numeric' ? Number(charge.amount.value) : null;
  worksheet.getCell(`D${row}`).value = charge.number.kind === 'numeric' ? Number(charge.number.value) : null;
  worksheet.getCell(`E${row}`).value = charge.currency;
  worksheet.getCell(`F${row}`).value = charge.completeness === 'complete' && charge.currency === targetCurrency
    ? { formula: `=IF(OR(NOT(ISNUMBER(C${row})),NOT(ISNUMBER(D${row}))),"",C${row}*D${row})` }
    : { formula: '=""' };
  for (let column = 2; column <= 6; column += 1) {
    const cell = worksheet.getCell(row, column);
    cell.font = { name: style.fontName, size: style.bodySize, color: { argb: style.border } };
    cell.alignment = { horizontal: 'center', ...(language === 'hebrew' && column === 2 ? { readingOrder: 'rtl' as const } : {}) };
    cell.border = { top: { style: 'thin', color: { argb: style.border } }, bottom: { style: 'thin', color: { argb: style.border } }, left: { style: column === 2 ? 'medium' : 'thin', color: { argb: style.border } }, right: { style: column === 6 ? 'medium' : 'thin', color: { argb: style.border } } };
    if (charge.completeness === 'incomplete' || charge.currency !== targetCurrency) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.warningFill } };
  }
  worksheet.getCell(`C${row}`).numFmt = language === 'hebrew' ? HEBREW_TEMPLATE_STYLE.numberFormats.currency : currencyNumberFormat(targetCurrency);
  worksheet.getCell(`F${row}`).numFmt = language === 'hebrew' ? HEBREW_TEMPLATE_STYLE.numberFormats.currency : currencyNumberFormat(targetCurrency);
}

function writeChargeRow(
  worksheet: ExcelJS.Worksheet,
  row: number,
  charge: CanonicalRoomChargeRow,
  language: ExportLanguage,
  targetCurrency: 'USD' | 'ILS',
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
      : currencyNumberFormat(targetCurrency);
  }
}

function roomTypeLabel(code: string | null, language: ExportLanguage): string {
  if (!code) return language === 'hebrew' ? 'סוג חדר לא פתור' : 'Unresolved room type';
  const roomType = ROOM_TYPES.find((item) => item.code === code);
  return roomType ? (language === 'hebrew' ? roomType.he : roomType.en) : code;
}

function currencyNumberFormat(currency: 'USD' | 'ILS'): string {
  return currency === 'USD' ? '"$" #,##0.00;[Red]-"$" #,##0.00' : '"₪" #,##0.00;[Red]-"₪" #,##0.00';
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

function styleHebrewSection(cell: ExcelJS.Cell, style: VisualStyle) {
  cell.font = { name: style.fontName, bold: true, size: style.sectionSize, color: { argb: style.border } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEBREW_TEMPLATE_STYLE.colors.section }, bgColor: { argb: HEBREW_TEMPLATE_STYLE.colors.sectionBackground } };
  cell.alignment = { horizontal: 'center' };
  cell.border = { top: { style: 'medium', color: { argb: style.border } }, bottom: { style: 'medium', color: { argb: style.border } }, left: { style: 'medium', color: { argb: style.border } }, right: { style: 'medium', color: { argb: style.border } } };
}

function styleHebrewHeader(cell: ExcelJS.Cell, style: VisualStyle, first: boolean, last: boolean) {
  cell.font = { name: style.fontName, bold: true, size: style.headerSize, color: { argb: style.border } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEBREW_TEMPLATE_STYLE.colors.header }, bgColor: { argb: HEBREW_TEMPLATE_STYLE.colors.headerBackground } };
  cell.alignment = { horizontal: 'center' };
  cell.border = {
    top: { style: 'medium', color: { argb: style.border } },
    left: { style: first ? 'medium' : 'thin', color: { argb: style.border } },
    right: { style: last ? 'medium' : 'thin', color: { argb: style.border } },
  };
}

function styleHebrewTotalLabel(cell: ExcelJS.Cell, style: VisualStyle, kind: HebrewTotalKind, fill: string | undefined) {
  cell.font = { name: style.fontName, bold: true, size: style.bodySize, color: { argb: style.border } };
  cell.alignment = { horizontal: 'center', readingOrder: 'rtl' };
  if (fill) {
    const background = kind === 'subtotal'
      ? HEBREW_TEMPLATE_STYLE.colors.beforeVatBackground
      : kind === 'includingVat'
        ? HEBREW_TEMPLATE_STYLE.colors.headerBackground
        : HEBREW_TEMPLATE_STYLE.colors.overallBackground;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill }, bgColor: { argb: background } };
  }
  cell.border = kind === 'subtotal'
    ? { top: { style: 'medium', color: { argb: style.border } }, bottom: { style: 'medium', color: { argb: style.border } }, left: { style: 'medium', color: { argb: style.border } }, right: { style: 'thin', color: { argb: style.border } } }
    : { top: { style: 'medium', color: { argb: style.border } }, bottom: { style: 'medium', color: { argb: style.border } }, left: { style: 'medium', color: { argb: style.border } }, right: { style: 'medium', color: { argb: style.border } } };
}

function styleHebrewTotalValue(cell: ExcelJS.Cell, style: VisualStyle, kind: HebrewTotalKind, fill: string | undefined) {
  cell.font = { name: style.fontName, bold: true, size: style.bodySize, color: { argb: style.border } };
  cell.alignment = { horizontal: 'center' };
  if (fill) {
    const background = kind === 'subtotal'
      ? HEBREW_TEMPLATE_STYLE.colors.beforeVatBackground
      : kind === 'includingVat'
        ? HEBREW_TEMPLATE_STYLE.colors.headerBackground
        : HEBREW_TEMPLATE_STYLE.colors.overallBackground;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill }, bgColor: { argb: background } };
  }
  cell.border = kind === 'subtotal'
    ? { top: { style: 'medium', color: { argb: style.border } }, bottom: { style: 'medium', color: { argb: style.border } }, left: { style: 'thin', color: { argb: style.border } }, right: { style: 'medium', color: { argb: style.border } } }
    : kind === 'includingVat'
      ? { top: { style: 'medium', color: { argb: style.border } }, bottom: { style: 'medium', color: { argb: style.border } }, left: { style: 'medium', color: { argb: style.border } }, right: { style: 'medium', color: { argb: style.border } } }
      : { top: { style: 'medium', color: { argb: style.border } }, bottom: { style: 'medium', color: { argb: style.border } }, right: { style: 'medium', color: { argb: style.border } } };
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
