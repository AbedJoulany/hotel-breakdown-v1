import type { IsoDate } from '../shared/types';

export interface RateObservation {
  reportDate: IsoDate;
  bookedRoomType: string | null;
  actualRoomType: string | null;
  adults: number | null;
  children: number | null;
  reportedRate: string | null;
}

export interface PriceSuggestion {
  reportDate: IsoDate;
  roomType: string;
  adults: number;
  children: number;
  rate: string;
  occurrenceCount: number;
}

export function buildPriceSuggestions(observations: RateObservation[]): PriceSuggestion[] {
  const grouped = new Map<string, PriceSuggestion>();

  for (const observation of observations) {
    const roomType = observation.bookedRoomType ?? observation.actualRoomType;
    const rate = observation.reportedRate?.trim() ?? '';
    if (!roomType || observation.adults === null || observation.children === null || !/^\d+(\.\d+)?$/u.test(rate)) {
      continue;
    }

    const key = `${observation.reportDate}::${roomType}::${observation.adults}::${observation.children}::${rate}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.occurrenceCount += 1;
    } else {
      grouped.set(key, {
        reportDate: observation.reportDate,
        roomType,
        adults: observation.adults,
        children: observation.children,
        rate,
        occurrenceCount: 1,
      });
    }
  }

  return [...grouped.values()].sort((left, right) => right.occurrenceCount - left.occurrenceCount);
}
