import { findRoomConflicts } from '../reports/roomOccupancy';
import type { RoomRecord } from '../reports/models';
import type { IsoDate } from '../shared/types';
import { matchPricingRule, type PricingRule, type SupportedCurrency } from './pricingRules';
import type { RecoveryAdjustment } from '../reports/recoveryAdjustments';

export interface FinancialPricingDay {
  reportDate: IsoDate;
  rooms: RoomRecord[];
}

export interface FinancialCharge {
  reportDate: IsoDate;
  roomNumber: string;
  roomType: string;
  rate: string;
  currency: SupportedCurrency;
}

export interface FinancialMissingPrice {
  reportDate: IsoDate;
  roomNumber: string;
  roomType: string;
  reason: 'missing-rule' | 'invalid-rate';
}

export interface FinancialPricingConflict {
  reportDate: IsoDate;
  roomNumber: string;
  ruleIds: string[];
}

export interface FinancialRoomConflict {
  reportDate: IsoDate;
  roomNumber: string;
}

export interface FinancialUnresolvedOccupancy {
  reportDate: IsoDate;
  roomNumber: string;
}

export interface FinancialSummary {
  charges: FinancialCharge[];
  totals: Record<SupportedCurrency, string>;
  missingPrices: FinancialMissingPrice[];
  pricingConflicts: FinancialPricingConflict[];
  roomConflicts: FinancialRoomConflict[];
  unresolvedOccupancies: FinancialUnresolvedOccupancy[];
}

export function calculateFinancialSummary(
  days: FinancialPricingDay[],
  rules: PricingRule[],
  recoveryAdjustments: RecoveryAdjustment[] = [],
): FinancialSummary {
  const totals: Record<SupportedCurrency, bigint> = { ILS: 0n, USD: 0n };
  const summary: Omit<FinancialSummary, 'totals'> = {
    charges: [],
    missingPrices: [],
    pricingConflicts: [],
    roomConflicts: [],
    unresolvedOccupancies: [],
  };

  for (const day of days) {
    const recordsByRoom = new Map<string, RoomRecord[]>();
    for (const room of day.rooms) {
      if (room.rooms === null || room.rooms <= 0) continue;
      recordsByRoom.set(room.roomNumber, [...(recordsByRoom.get(room.roomNumber) ?? []), room]);
    }

    const roomConflicts = new Set(findRoomConflicts(day.rooms).map((conflict) => conflict.roomNumber));
    for (const [roomNumber, records] of recordsByRoom) {
      if (roomConflicts.has(roomNumber)) {
        summary.roomConflicts.push({ reportDate: day.reportDate, roomNumber });
        continue;
      }

      const room = records[0];
      if (!isSupportedOccupancy(room.adults, room.children)) {
        summary.unresolvedOccupancies.push({ reportDate: day.reportDate, roomNumber });
        continue;
      }
      const roomType = room.bookedRoomType ?? room.actualRoomType ?? '';
      const recoveryOverride = recoveryAdjustments.find((adjustment) => adjustment.status === 'approved'
        && adjustment.included
        && adjustment.targetDate === day.reportDate
        && adjustment.room.roomNumber === roomNumber);

      if (recoveryOverride) {
        const minorUnits = recoveryOverride.currency && recoveryOverride.approvedRate !== null
          ? parseRateToMinorUnits(recoveryOverride.approvedRate)
          : null;
        if (minorUnits === null) {
          summary.missingPrices.push({ reportDate: day.reportDate, roomNumber, roomType, reason: 'invalid-rate' });
          continue;
        }

        totals[recoveryOverride.currency!] += minorUnits;
        summary.charges.push({
          reportDate: day.reportDate,
          roomNumber,
          roomType,
          rate: formatMinorUnits(minorUnits),
          currency: recoveryOverride.currency!,
        });
        continue;
      }

      const result = matchPricingRule({
        reportDate: day.reportDate,
        roomType,
        adults: room.adults,
        children: room.children,
      }, rules);

      if (result.kind === 'missing-price') {
        summary.missingPrices.push({ reportDate: day.reportDate, roomNumber, roomType, reason: 'missing-rule' });
        continue;
      }
      if (result.kind === 'pricing-conflict') {
        summary.pricingConflicts.push({ reportDate: day.reportDate, roomNumber, ruleIds: result.rules.map((rule) => rule.id) });
        continue;
      }

      const minorUnits = parseRateToMinorUnits(result.rule.rate);
      if (minorUnits === null) {
        summary.missingPrices.push({ reportDate: day.reportDate, roomNumber, roomType, reason: 'invalid-rate' });
        continue;
      }

      totals[result.rule.currency] += minorUnits;
      summary.charges.push({
        reportDate: day.reportDate,
        roomNumber,
        roomType,
        rate: formatMinorUnits(minorUnits),
        currency: result.rule.currency,
      });
    }
  }

  return {
    ...summary,
    totals: {
      ILS: formatMinorUnits(totals.ILS),
      USD: formatMinorUnits(totals.USD),
    },
  };
}

function isSupportedOccupancy(adults: number | null, children: number | null): boolean {
  return (adults === 1 && children === 0)
    || (adults === 2 && children === 0)
    || (adults === 3 && children === 0)
    || (adults === 1 && children === 1)
    || (adults === 2 && children === 1)
    || (adults === 2 && children === 2);
}

function parseRateToMinorUnits(rate: string): bigint | null {
  const match = /^(\d+)(?:\.(\d+))?$/u.exec(rate.trim());
  if (!match) return null;

  const fraction = (match[2] ?? '').padEnd(3, '0');
  let minorUnits = BigInt(match[1]) * 100n + BigInt(fraction.slice(0, 2));
  if (fraction[2] >= '5') minorUnits += 1n;
  return minorUnits;
}

function formatMinorUnits(minorUnits: bigint): string {
  const whole = minorUnits / 100n;
  const fraction = (minorUnits % 100n).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
}
