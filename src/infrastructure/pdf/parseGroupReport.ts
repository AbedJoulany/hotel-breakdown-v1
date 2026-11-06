import { normalizeGroupReportRow, normalizeReportDate } from '../../domain/reports/normalizeGroupReportRow';
import type { DailyGroupSnapshot, RoomRecord } from '../../domain/reports/models';
import type { PdfTextItem, PdfTextPage } from './pdfTextExtractor';

export interface ParsedGroupReport {
  reportDate: string;
  groups: DailyGroupSnapshot[];
}

export function parseGroupReport(pages: PdfTextPage[]): ParsedGroupReport {
  const reportDate = findReportDate(pages);
  const groups = mergeGroups(pages.flatMap((page) => parsePageGroups(page, reportDate)));

  return { reportDate, groups };
}

function mergeGroups(groups: DailyGroupSnapshot[]): DailyGroupSnapshot[] {
  const merged = new Map<string, DailyGroupSnapshot>();

  for (const group of groups) {
    const existing = merged.get(group.groupName);
    if (existing) {
      existing.rooms.push(...group.rooms);
    } else {
      merged.set(group.groupName, { ...group, rooms: [...group.rooms] });
    }
  }

  return [...merged.values()];
}

function parsePageGroups(page: PdfTextPage, reportDate: string): DailyGroupSnapshot[] {
  const headers = page.items
    .filter((item) => item.text.trim() === 'Group Name:')
    .sort((a, b) => a.y - b.y);

  return headers.map((header, index) => {
    const nextHeaderY = headers[index + 1]?.y ?? page.height;
    const groupName = page.items
      .filter((item) => Math.abs(item.y - header.y) <= 1 && item.x > header.x + 60 && item.x < 400)
      .sort((a, b) => a.x - b.x)
      .map((item) => item.text.trim())
      .join(' ')
      .trim();

    const roomItems = page.items
      .filter((item) => isRoomNumber(item.text) && item.x < 65)
      .filter((item) => item.y > header.y + 15 && item.y < nextHeaderY - 3)
      .sort((a, b) => a.y - b.y);

    const rooms = roomItems.map((roomItem) => parseRoomRow(page.items, roomItem));

    return {
      reportId: `page-${page.pageNumber}-${Math.round(header.y)}`,
      reportDate: reportDate as DailyGroupSnapshot['reportDate'],
      groupName,
      rooms,
    };
  });
}

function parseRoomRow(items: PdfTextItem[], roomItem: PdfTextItem): RoomRecord {
  const rowItems = items.filter(
    (item) => item.y >= roomItem.y - 1 && item.y <= roomItem.y + 11,
  );

  return normalizeGroupReportRow({
    room: roomItem.text,
    guest: textAt(rowItems, 68, 60, 230) ?? '',
    reservationNumber: textAt(rowItems, 234, 230, 280, true),
    rm: textAt(rowItems, 284, 278, 308),
    upg: textAt(rowItems, 311, 306, 337),
    blockCode: textAt(rowItems, 338, 334, 415),
    fromDate: textAt(rowItems, 419, 415, 480),
    toDate: textAt(rowItems, 482, 478, 538),
    adults: textAt(rowItems, 540, 536, 574),
    children: textAt(rowItems, 576, 572, 610),
    babies: textAt(rowItems, 612, 608, 642),
    rooms: textAt(rowItems, 644, 640, 669),
    rateCode: textAt(rowItems, 671, 667, 724),
    rate: textAt(rowItems, 726, 722, 790),
  });
}

function textAt(
  items: PdfTextItem[],
  x: number,
  minX: number,
  maxX: number,
  concatenate = false,
): string | undefined {
  const matches = items
    .filter((item) => item.x >= minX && item.x < maxX)
    .sort((a, b) => a.y - b.y || a.x - b.x);

  if (concatenate) {
    return matches.length ? matches.map((item) => item.text.trim()).join('') : undefined;
  }

  const match = matches.find((item) => Math.abs(item.x - x) <= 3) ?? matches[0];
  return match?.text.trim() || undefined;
}

function findReportDate(pages: PdfTextPage[]): string {
  const dateItem = pages
    .flatMap((page) => page.items)
    .find((item) => /^\d{1,2} [A-Za-z]{3} \d{4}$/.test(item.text.trim()));

  const reportDate = normalizeReportDate(dateItem?.text);
  if (!reportDate) {
    throw new Error('Group report date was not found');
  }

  return reportDate;
}

function isRoomNumber(value: string): boolean {
  return /^\d{4}$/.test(value.trim());
}
