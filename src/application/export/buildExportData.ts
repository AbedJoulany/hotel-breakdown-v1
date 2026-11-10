import { groupMatchKey } from '../../domain/reports/groupMatch';
import { applyRoomCorrections } from '../../domain/reports/roomCorrections';
import { findRoomConflicts } from '../../domain/reports/roomOccupancy';
import { matchPricingRule, type PricingRule } from '../../domain/pricing/pricingRules';
import type { ActiveReportDocument, RoomRecord } from '../../domain/reports/models';
import type { RoomCorrection } from '../../domain/reports/roomCorrections';
import type { IsoDate } from '../../domain/shared/types';
import type {
  CanonicalExportModel,
  CanonicalNight,
  CanonicalRoomChargeRow,
  ExportBuildInput,
  ExportGroupingKey,
  ExportIssue,
  ExportSourceRef,
  OccupancyCategory,
  RateValue,
  PricingStatus,
} from '../../domain/export/models';
import type { SupportedCurrency } from '../../domain/pricing/pricingRules';
import type { AdditionalChargeRow } from '../../domain/charges/models';
import type { ComplimentaryStaffRow } from '../../domain/charges/complimentaryStaffModels';
import { ROOM_TYPES } from '../../domain/rooms/roomTypes';

const OCCUPANCY_ORDER: OccupancyCategory[] = [
  'single',
  'double',
  'triple',
  'single-child',
  'double-child',
  'double-two-children',
  'unresolved',
];

export function buildExportData(input: ExportBuildInput): CanonicalExportModel {
  const groupedByDate = new Map<IsoDate, Map<string, CanonicalRoomChargeRow>>();
  const warnings: ExportIssue[] = [];
  let factSequence = 0;
  let rowSequence = 0;
  const checkInDates: IsoDate[] = [];
  const checkOutDates: IsoDate[] = [];
  const additionalCharges = (input.additionalCharges ?? [])
    .filter((row) => row.description.trim() || row.price.trim() || row.quantity !== '1' || row.number !== '1')
    .map(toCanonicalAdditionalCharge);
  const complimentaryStaff = (input.complimentaryStaff ?? [])
    .filter((row) => row.amount.trim() || row.number !== '1')
    .map(toCanonicalComplimentaryStaff);

  for (const report of input.reports) {
    const group = report.groupSnapshots.find((snapshot) => groupMatchKey(snapshot.groupName) === groupMatchKey(input.selectedGroupName));
    if (!group) continue;

    const correctedRooms = applyRoomCorrections(
      group.rooms,
      input.corrections.filter((correction) => correction.reportId === group.reportId),
    );
    correctedRooms.forEach((room) => {
      if (room.fromDate) checkInDates.push(room.fromDate);
      if (room.toDate) checkOutDates.push(room.toDate);
    });
    const sourceIndexes = new Map<RoomRecord, number>();
    group.rooms.forEach((room, index) => sourceIndexes.set(room, index));
    const conflicts = new Set(findRoomConflicts(correctedRooms).map((conflict) => conflict.roomNumber));
    const dateGroups = groupedByDate.get(report.reportDate) ?? new Map<string, CanonicalRoomChargeRow>();

    const byRoom = new Map<string, RoomRecord[]>();
    correctedRooms
      .filter((room) => room.rooms !== null && room.rooms > 0)
      .forEach((room) => byRoom.set(room.roomNumber, [...(byRoom.get(room.roomNumber) ?? []), room]));

    for (const [roomNumber, records] of byRoom) {
      const room = records[0];
      const factIds = records.map(() => `fact-${++factSequence}`);
      const sourceRefs = records.map((record, index): ExportSourceRef => ({
        factId: factIds[index],
        reportId: group.reportId,
        contentHash: report.contentHash,
        reportDate: report.reportDate,
        groupName: group.groupName,
        roomNumber: record.roomNumber,
        sourceRecordIndex: sourceIndexes.get(record) ?? -1,
        correctionId: input.corrections.find((correction) => correction.reportId === group.reportId
          && correction.roomNumber === record.roomNumber)?.id ?? null,
      }));
      const roomType = room.bookedRoomType;
      const occupancy = classifyOccupancy(room.adults, room.children);
      const issues: ExportIssue[] = [];

      if (conflicts.has(roomNumber)) {
        issues.push({
          code: 'duplicate-room-conflict',
          severity: 'final-blocker',
          affects: 'financial',
          message: `Duplicate room conflict for room ${roomNumber}`,
          sourceFactIds: factIds,
        });
      }
      if (roomType === null) {
        issues.push({
          code: 'missing-booked-room-type',
          severity: 'warning',
          affects: 'data',
          message: 'Booked Room Type is missing',
          sourceFactIds: factIds,
        });
      }
      if (occupancy === 'unresolved') {
        issues.push({
          code: 'unresolved-occupancy',
          severity: 'final-blocker',
          affects: 'data',
          message: 'Occupancy category is unresolved',
          sourceFactIds: factIds,
        });
      }

      const pricing = matchPricingRule({
        reportDate: report.reportDate,
        roomType: roomType ?? '',
        adults: room.adults,
        children: room.children,
      }, input.pricingRules);
      let rate: RateValue = { kind: 'missing' };
      let currency: SupportedCurrency | null = null;
      let pricingStatus: PricingStatus = 'unresolved';

      if (pricing.kind === 'matched') {
        const numericRate = parseNumericRate(pricing.rule.rate);
        if (numericRate) {
          rate = numericRate;
          currency = pricing.rule.currency;
          pricingStatus = 'resolved';
        } else {
          rate = toRateValue(pricing.rule.rate);
          currency = pricing.rule.currency;
          pricingStatus = 'unresolved';
        }
      } else if (pricing.kind === 'missing-price') {
        pricingStatus = 'missing-price';
        issues.push({
          code: 'missing-price',
          severity: 'final-blocker',
          affects: 'financial',
          message: 'No valid pricing rule matched this room',
          sourceFactIds: factIds,
        });
      } else {
        pricingStatus = 'pricing-conflict';
        issues.push({
          code: 'pricing-conflict',
          severity: 'final-blocker',
          affects: 'financial',
          message: `Multiple pricing rules matched this room: ${pricing.rules.map((rule) => rule.id).join(', ')}`,
          sourceFactIds: factIds,
        });
      }

      const groupingKey: ExportGroupingKey = {
        reportDate: report.reportDate,
        bookedRoomType: roomType,
        occupancyCategory: occupancy,
        rateKey: rateKey(rate),
        currency,
      };
      const key = serializeGroupingKey(groupingKey);
      const existing = dateGroups.get(key);
      if (existing) {
        existing.roomCount += 1;
        existing.sourceRefs.push(...sourceRefs);
        existing.issues.push(...issues);
        existing.dataCompleteness = existing.issues.some((issue) => issue.affects === 'data') ? 'incomplete' : existing.dataCompleteness;
        existing.financialCompleteness = existing.issues.some((issue) => issue.affects === 'financial') ? 'incomplete' : existing.financialCompleteness;
      } else {
        const row: CanonicalRoomChargeRow = {
          groupedRowId: `row-${++rowSequence}`,
          groupingKey,
          reportDate: report.reportDate,
          bookedRoomType: roomType,
          adults: room.adults,
          children: room.children,
          occupancyCategory: occupancy,
          roomCount: 1,
          nights: 1,
          rate,
          currency,
          pricingStatus,
          dataCompleteness: issues.some((issue) => issue.affects === 'data') ? 'incomplete' : 'complete',
          financialCompleteness: issues.some((issue) => issue.affects === 'financial') || pricingStatus !== 'resolved'
            ? 'incomplete'
            : 'complete',
          issues,
          sourceRefs,
        };
        dateGroups.set(key, row);
      }
    }
    groupedByDate.set(report.reportDate, dateGroups);
  }

  const nights: CanonicalNight[] = [...groupedByDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([reportDate, rows]) => {
      const roomCharges = [...rows.values()].sort(compareRows);
      const night: CanonicalNight = {
        reportDate,
        roomCharges,
        dataCompleteness: roomCharges.some((row) => row.dataCompleteness === 'incomplete') ? 'incomplete' : 'complete',
        financialCompleteness: roomCharges.some((row) => row.financialCompleteness === 'incomplete') ? 'incomplete' : 'complete',
      };
      warnings.push(...roomCharges.flatMap((row) => row.issues));
      return night;
    });

  return {
    metadata: {
      hotelName: null,
      groupName: input.selectedGroupName,
      checkInDate: minDate(checkInDates) ?? nights[0]?.reportDate ?? null,
      checkOutDate: maxDate(checkOutDates) ?? nights.at(-1)?.reportDate ?? null,
      reportDates: nights.map((night) => night.reportDate),
      currencies: [...new Set([
        ...nights.flatMap((night) => night.roomCharges.map((row) => row.currency).filter((currency): currency is SupportedCurrency => currency !== null)),
        ...additionalCharges.map((row) => row.currency),
        ...complimentaryStaff.map((row) => row.currency),
      ])],
    },
    nights,
    additionalCharges,
    complimentaryStaff,
    warnings: [...warnings, ...additionalCharges.flatMap((row) => row.issues), ...complimentaryStaff.flatMap((row) => row.issues)],
  };
}

function toCanonicalAdditionalCharge(row: AdditionalChargeRow) {
  const price = toRateValue(row.price);
  const quantity = toRateValue(row.quantity);
  const number = toRateValue(row.number);
  const issues = [] as ExportIssue[];
  if (price.kind !== 'numeric') {
    issues.push({ code: 'additional-charge-missing-price', severity: 'warning', affects: 'financial', message: `Additional charge "${row.description || 'Unnamed'}" has no valid price`, sourceFactIds: [] });
  }
  if (quantity.kind !== 'numeric' || number.kind !== 'numeric') {
    issues.push({ code: 'additional-charge-invalid-multiplier', severity: 'warning', affects: 'financial', message: `Additional charge "${row.description || 'Unnamed'}" has an invalid quantity or number`, sourceFactIds: [] });
  }
  if (!row.description.trim()) {
    issues.push({ code: 'additional-charge-missing-description', severity: 'warning', affects: 'data', message: 'Additional charge description is missing', sourceFactIds: [] });
  }
  return {
    id: row.id,
    description: row.description,
    price,
    quantity,
    number,
    currency: row.currency,
    financialCompleteness: issues.some((issue) => issue.affects === 'financial') ? 'incomplete' as const : 'complete' as const,
    issues,
  };
}

function toCanonicalComplimentaryStaff(row: ComplimentaryStaffRow) {
  const amount = toRateValue(row.amount);
  const number = toRateValue(row.number);
  const issues: ExportIssue[] = [];
  if (amount.kind !== 'numeric') {
    issues.push({ code: 'complimentary-staff-invalid-amount', severity: 'warning', affects: 'financial', message: `Complimentary/Staff ${row.type} line has no valid amount`, sourceFactIds: [] });
  }
  if (number.kind !== 'numeric' || Number(number.value) < 1 || !Number.isInteger(Number(number.value))) {
    issues.push({ code: 'complimentary-staff-invalid-number', severity: 'warning', affects: 'financial', message: `Complimentary/Staff ${row.type} line has an invalid number`, sourceFactIds: [] });
  }
  return {
    id: row.id,
    type: row.type,
    amount,
    number,
    currency: row.currency,
    completeness: issues.length ? 'incomplete' as const : 'complete' as const,
    issues,
  };
}

function minDate(values: IsoDate[]): IsoDate | null {
  return values.length ? [...values].sort()[0] : null;
}

function maxDate(values: IsoDate[]): IsoDate | null {
  return values.length ? [...values].sort().at(-1)! : null;
}

export function applyRateOverrides(
  model: CanonicalExportModel,
  overrides: ReadonlyMap<string, string>,
): CanonicalExportModel {
  if (overrides.size === 0) return model;

  const nights = model.nights.map((night) => ({
    ...night,
    roomCharges: night.roomCharges.map((row) => {
      const override = overrides.get(row.groupedRowId);
      if (override === undefined) return row;
      const rate = toRateValue(override);
      const issues = row.issues.filter((issue) => issue.code !== 'missing-price' && issue.code !== 'pricing-conflict');
      const pricingStatus: PricingStatus = rate.kind === 'numeric' ? 'resolved' : 'unresolved';
      if (rate.kind !== 'numeric') {
        issues.push({ code: 'missing-price', severity: 'final-blocker', affects: 'financial', message: 'Preview rate is not numeric', sourceFactIds: row.sourceRefs.map((ref) => ref.factId) });
      }
      const nextRow: CanonicalRoomChargeRow = {
        ...row,
        groupingKey: { ...row.groupingKey, rateKey: rateKey(rate) },
        rate,
        pricingStatus,
        issues,
        financialCompleteness: rate.kind === 'numeric' && !issues.some((issue) => issue.affects === 'financial') ? 'complete' : 'incomplete',
      };
      return nextRow;
    }),
  }));
  return {
    ...model,
    nights: nights.map((night) => ({
      ...night,
      financialCompleteness: night.roomCharges.some((row) => row.financialCompleteness === 'incomplete') ? 'incomplete' : 'complete',
    })),
    warnings: nights.flatMap((night) => night.roomCharges.flatMap((row) => row.issues)),
  };
}

function classifyOccupancy(adults: number | null, children: number | null): OccupancyCategory {
  const key = `${adults ?? ''}/${children ?? ''}`;
  return ({
    '1/0': 'single',
    '2/0': 'double',
    '3/0': 'triple',
    '1/1': 'single-child',
    '2/1': 'double-child',
    '2/2': 'double-two-children',
  } as Record<string, OccupancyCategory>)[key] ?? 'unresolved';
}

function parseNumericRate(value: string): RateValue | null {
  return /^[-+]?\d+(?:\.\d+)?$/u.test(value.trim()) ? { kind: 'numeric', value: normalizeDecimal(value) } : null;
}

function toRateValue(value: string | null | undefined): RateValue {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return { kind: 'missing' };
  return parseNumericRate(trimmed) ?? { kind: 'textual', raw: trimmed };
}

function normalizeDecimal(value: string): string {
  const trimmed = value.trim().replace(/^\+/u, '');
  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [whole, fraction = ''] = unsigned.split('.');
  const normalizedWhole = whole.replace(/^0+(?=\d)/u, '') || '0';
  const normalizedFraction = fraction.replace(/0+$/u, '');
  const normalized = normalizedFraction ? `${normalizedWhole}.${normalizedFraction}` : normalizedWhole;
  return negative && normalized !== '0' ? `-${normalized}` : normalized;
}

function rateKey(rate: RateValue): string {
  if (rate.kind === 'numeric') return `numeric:${rate.value}`;
  if (rate.kind === 'textual') return `textual:${rate.raw}`;
  return 'missing';
}

function serializeGroupingKey(key: ExportGroupingKey): string {
  return [key.reportDate, key.bookedRoomType ?? 'unresolved', key.occupancyCategory, key.rateKey, key.currency ?? 'unresolved'].join('|');
}

function compareRows(left: CanonicalRoomChargeRow, right: CanonicalRoomChargeRow): number {
  const leftType = ROOM_TYPES.findIndex((roomType) => roomType.code === left.bookedRoomType);
  const rightType = ROOM_TYPES.findIndex((roomType) => roomType.code === right.bookedRoomType);
  return (leftType < 0 ? Number.MAX_SAFE_INTEGER : leftType) - (rightType < 0 ? Number.MAX_SAFE_INTEGER : rightType)
    || OCCUPANCY_ORDER.indexOf(left.occupancyCategory) - OCCUPANCY_ORDER.indexOf(right.occupancyCategory)
    || left.groupingKey.rateKey.localeCompare(right.groupingKey.rateKey);
}
