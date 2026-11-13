import type { FolioComparisonResult, FolioEntry, FolioStayComparisonResult, GroupRoomForFolioComparison } from './models';
import type { SupportedCurrency } from '../pricing/pricingRules';
import type { IsoDate } from '../shared/types';

export const FOLIO_AMOUNT_TOLERANCE_MINOR_UNITS = 1n;

export function compareFolioToGroup(
  groupRooms: GroupRoomForFolioComparison[],
  folioEntries: FolioEntry[],
  currency: SupportedCurrency,
): FolioComparisonResult[] {
  const groupNightsByStay = new Map<string, Set<string>>();
  for (const room of groupRooms) {
    const key = stayKey(room.roomNumber, room.guestName);
    const dates = groupNightsByStay.get(key) ?? new Set<string>();
    dates.add(room.reportDate);
    groupNightsByStay.set(key, dates);
  }

  const folioEntriesByStay = new Map<string, FolioEntry[]>();
  for (const entry of folioEntries.filter((entry) => entry.currency === currency)) {
    const key = stayKey(entry.roomNumber, entry.guestName);
    folioEntriesByStay.set(key, [...(folioEntriesByStay.get(key) ?? []), entry]);
  }

  const groupByRoom = new Map<string, GroupRoomForFolioComparison>();
  for (const room of groupRooms) {
    const key = `${room.reportDate}|${room.roomNumber}`;
    if (!groupByRoom.has(key)) groupByRoom.set(key, room);
  }

  const folioByRoom = new Map<string, FolioEntry[]>();
  for (const entry of folioEntries.filter((entry) => entry.currency === currency)) {
    const key = `${entry.transactionDate}|${entry.roomNumber}`;
    folioByRoom.set(key, [...(folioByRoom.get(key) ?? []), entry]);
  }

  const comparisonKeys = new Set([...groupByRoom.keys(), ...folioByRoom.keys()]);
  return [...comparisonKeys].sort().map((key) => {
    const groupRoom = groupByRoom.get(key);
    const entries = folioByRoom.get(key) ?? [];
    const reportDate = groupRoom?.reportDate ?? entries[0]?.transactionDate;
    const roomNumber = groupRoom?.roomNumber ?? entries[0]?.roomNumber ?? '';
    const guestName = groupRoom?.guestName ?? entries[0]?.guestName ?? '';
    const stayEntries = folioEntriesByStay.get(stayKey(roomNumber, guestName)) ?? entries;
    const groupNightCount = groupNightsByStay.get(stayKey(roomNumber, guestName))?.size ?? 0;
    const folioEntryCount = stayEntries.length;
    const folioNightCount = stayEntries.length > 0 && stayEntries.every((entry) => entry.nights !== null)
      ? stayEntries.reduce((total, entry) => total + (entry.nights ?? 0), 0)
      : null;
    const folioAmount = sumAmounts(entries.map((entry) => entry.charges).filter((amount): amount is string => amount !== null));
    const groupAmount = groupRoom?.reportedRate ?? null;

    if (!reportDate) throw new Error(`Folio comparison is missing a report date for room: ${roomNumber}`);
    if (!groupRoom) return { reportDate, roomNumber, guestName, groupNightCount, folioNightCount, folioEntryCount, groupAmount: null, folioAmount, currency, status: 'missing-in-group' };
    if (entries.length === 0) return { reportDate, roomNumber, guestName, groupNightCount, folioNightCount, folioEntryCount, groupAmount, folioAmount: null, currency, status: 'missing-in-folio' };
    if (groupAmount === null || folioAmount === null) return { reportDate, roomNumber, guestName, groupNightCount, folioNightCount, folioEntryCount, groupAmount, folioAmount, currency, status: 'data-missing' };

    return {
      reportDate,
      roomNumber,
      guestName,
      groupNightCount,
      folioNightCount,
      folioEntryCount,
      groupAmount,
      folioAmount,
      currency,
      status: amountsMatchWithinTolerance(groupAmount, folioAmount) ? 'matched' : 'amount-mismatch',
    };
  });
}

export function summarizeFolioStayComparison(
  groupRooms: GroupRoomForFolioComparison[],
  folioEntries: FolioEntry[],
  currency: SupportedCurrency,
): FolioStayComparisonResult[] {
  const groupByStay = new Map<string, GroupRoomForFolioComparison[]>();
  const uniqueGroupRows = new Map<string, GroupRoomForFolioComparison>();
  for (const room of groupRooms) {
    uniqueGroupRows.set(`${room.reportDate}|${room.roomNumber}`, room);
  }
  for (const room of uniqueGroupRows.values()) {
    const key = stayKey(room.roomNumber, room.guestName);
    groupByStay.set(key, [...(groupByStay.get(key) ?? []), room]);
  }

  const folioByStay = new Map<string, FolioEntry[]>();
  for (const entry of folioEntries.filter((entry) => entry.currency === currency)) {
    const key = stayKey(entry.roomNumber, entry.guestName);
    folioByStay.set(key, [...(folioByStay.get(key) ?? []), entry]);
  }

  const consumedFolioKeys = new Set<string>();
  const rows: Array<{ key: string; groupRows: GroupRoomForFolioComparison[]; entries: FolioEntry[] }> = [];
  for (const key of groupByStay.keys()) {
    const matchingFolioKeys = [...folioByStay.keys()].filter((folioKey) => stayKeysMatch(key, folioKey));
    matchingFolioKeys.forEach((folioKey) => consumedFolioKeys.add(folioKey));
    rows.push({
      key,
      groupRows: groupByStay.get(key) ?? [],
      entries: matchingFolioKeys.flatMap((folioKey) => folioByStay.get(folioKey) ?? []),
    });
  }
  for (const key of folioByStay.keys()) {
    if (!consumedFolioKeys.has(key)) rows.push({ key, groupRows: [], entries: folioByStay.get(key) ?? [] });
  }

  return rows.sort((left, right) => left.key.localeCompare(right.key)).map(({ groupRows, entries }) => {
    const groupRoom = groupRows[0];
    const folioEntry = entries[0];
    const roomNumber = groupRoom?.roomNumber ?? folioEntry?.roomNumber ?? '';
    const guestName = groupRoom?.guestName ?? folioEntry?.guestName ?? '';
    const groupAmount = sumAmounts(groupRows.map((room) => room.reportedRate).filter((amount): amount is string => amount !== null));
    const folioAmount = sumAmounts(entries.map((entry) => entry.charges).filter((amount): amount is string => amount !== null));
    const folioNightCount = entries.length > 0 && entries.every((entry) => entry.nights !== null)
      ? entries.reduce((total, entry) => total + (entry.nights ?? 0), 0)
      : null;
    const missingGroupReportDates = findMissingGroupReportDates(groupRows, entries);
    const expectedMissingDates = findExpectedMissingDates(groupRows);
    const coverageWarning = expectedMissingDates.length > 0 && missingGroupReportDates.length === 0
      ? 'possible-incomplete-coverage' as const
      : undefined;

    let status: FolioStayComparisonResult['status'];
    if (!groupRoom) status = 'missing-in-group';
    else if (entries.length === 0) status = 'missing-in-folio';
    else if (groupAmount === null || folioAmount === null) status = 'data-missing';
    else if (missingGroupReportDates.length > 0) status = 'incomplete-group-report';
    else status = amountsMatchWithinTolerance(groupAmount, folioAmount) ? 'matched' : 'amount-mismatch';

    return {
      roomNumber,
      guestName,
      groupNightCount: new Set(groupRows.map((room) => room.reportDate)).size,
      folioNightCount,
      folioEntryCount: entries.length,
      groupAmount,
      folioAmount,
      currency: currency ?? null,
      status,
      ...(missingGroupReportDates.length > 0 ? { missingGroupReportDates } : {}),
      ...(coverageWarning ? { coverageWarning } : {}),
    };
  });
}

function findExpectedMissingDates(groupRows: GroupRoomForFolioComparison[]): IsoDate[] {
  const expected = new Set<IsoDate>();
  for (const room of groupRows) {
    for (const date of stayDates(room.fromDate, room.toDate)) expected.add(date);
  }
  const observed = new Set(groupRows.map((room) => room.reportDate));
  return [...expected].filter((date) => !observed.has(date)).sort();
}

function findMissingGroupReportDates(
  groupRows: GroupRoomForFolioComparison[],
  entries: FolioEntry[],
): IsoDate[] {
  const folioDates = new Set(entries.map((entry) => entry.transactionDate));
  return findExpectedMissingDates(groupRows).filter((date) => folioDates.has(date));
}

function stayDates(fromDate: IsoDate | null | undefined, toDate: IsoDate | null | undefined): IsoDate[] {
  if (!fromDate || !toDate || fromDate >= toDate) return [];
  const dates: IsoDate[] = [];
  const cursor = new Date(`${fromDate}T00:00:00Z`);
  const end = new Date(`${toDate}T00:00:00Z`);
  while (cursor < end) {
    dates.push(cursor.toISOString().slice(0, 10) as IsoDate);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function stayKey(roomNumber: string, guestName: string): string {
  const nameParts = guestName.trim().replace(/\s+/gu, ' ').toLocaleLowerCase().split(' ').sort();
  return `${roomNumber}|${nameParts.join(' ')}`;
}

function stayKeysMatch(left: string, right: string): boolean {
  if (left === right) return true;
  const leftSeparator = left.indexOf('|');
  const rightSeparator = right.indexOf('|');
  if (leftSeparator < 0 || rightSeparator < 0 || left.slice(0, leftSeparator) !== right.slice(0, rightSeparator)) return false;
  return guestNamesMatch(left.slice(leftSeparator + 1), right.slice(rightSeparator + 1));
}

function guestNamesMatch(left: string, right: string): boolean {
  const leftParts = left.split(' ').filter(Boolean);
  const remainingRightParts = right.split(' ').filter(Boolean);
  if (leftParts.length !== remainingRightParts.length) return false;
  let prefixDifferences = 0;
  for (const leftPart of leftParts) {
    const exactIndex = remainingRightParts.indexOf(leftPart);
    if (exactIndex >= 0) {
      remainingRightParts.splice(exactIndex, 1);
      continue;
    }
    const prefixIndex = remainingRightParts.findIndex((rightPart) => {
      const shorter = leftPart.length <= rightPart.length ? leftPart : rightPart;
      const longer = leftPart.length <= rightPart.length ? rightPart : leftPart;
      return shorter.length >= 6 && longer.startsWith(shorter);
    });
    if (prefixIndex < 0) return false;
    const matchedPart = remainingRightParts[prefixIndex];
    const shorter = leftPart.length <= matchedPart.length ? leftPart : matchedPart;
    const longer = leftPart.length <= matchedPart.length ? matchedPart : leftPart;
    if (shorter.length < 6 || !longer.startsWith(shorter)) return false;
    remainingRightParts.splice(prefixIndex, 1);
    prefixDifferences += 1;
  }
  return prefixDifferences <= 1;
}

function sumAmounts(amounts: string[]): string | null {
  if (amounts.length === 0) return null;
  const total = amounts.reduce<bigint | null>((sum, amount) => {
    const parsed = toMinorUnits(amount);
    return parsed === null || sum === null ? null : sum + parsed;
  }, 0n);
  return total === null ? null : formatMinorUnits(total);
}

function toMinorUnits(value: string): bigint | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/u.exec(value.trim().replace(/,/g, ''));
  if (!match) return null;
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
}

function amountsMatchWithinTolerance(groupAmount: string, folioAmount: string): boolean {
  const groupMinorUnits = toMinorUnits(groupAmount);
  const folioMinorUnits = toMinorUnits(folioAmount);
  if (groupMinorUnits === null || folioMinorUnits === null) return false;
  const difference = groupMinorUnits >= folioMinorUnits
    ? groupMinorUnits - folioMinorUnits
    : folioMinorUnits - groupMinorUnits;
  return difference <= FOLIO_AMOUNT_TOLERANCE_MINOR_UNITS;
}

function formatMinorUnits(value: bigint): string {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`;
}
