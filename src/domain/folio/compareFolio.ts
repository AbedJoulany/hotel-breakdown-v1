import type { FolioComparisonResult, FolioEntry, FolioStayComparisonResult, GroupRoomForFolioComparison } from './models';
import type { SupportedCurrency } from '../pricing/pricingRules';

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

  const keys = new Set([...groupByStay.keys(), ...folioByStay.keys()]);
  return [...keys].sort().map((key) => {
    const groupRows = groupByStay.get(key) ?? [];
    const entries = folioByStay.get(key) ?? [];
    const groupRoom = groupRows[0];
    const folioEntry = entries[0];
    const roomNumber = groupRoom?.roomNumber ?? folioEntry?.roomNumber ?? '';
    const guestName = groupRoom?.guestName ?? folioEntry?.guestName ?? '';
    const groupAmount = sumAmounts(groupRows.map((room) => room.reportedRate).filter((amount): amount is string => amount !== null));
    const folioAmount = sumAmounts(entries.map((entry) => entry.charges).filter((amount): amount is string => amount !== null));
    const folioNightCount = entries.length > 0 && entries.every((entry) => entry.nights !== null)
      ? entries.reduce((total, entry) => total + (entry.nights ?? 0), 0)
      : null;

    let status: FolioStayComparisonResult['status'];
    if (!groupRoom) status = 'missing-in-group';
    else if (entries.length === 0) status = 'missing-in-folio';
    else if (groupAmount === null || folioAmount === null) status = 'data-missing';
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
    };
  });
}

function stayKey(roomNumber: string, guestName: string): string {
  const nameParts = guestName.trim().replace(/\s+/gu, ' ').toLocaleLowerCase().split(' ').sort();
  return `${roomNumber}|${nameParts.join(' ')}`;
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

