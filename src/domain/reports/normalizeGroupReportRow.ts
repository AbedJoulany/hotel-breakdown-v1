import type { IsoDate } from '../shared/types';
import type { RoomRecord } from './models';

export interface RawGroupReportRow {
  room: string;
  guest: string;
  reservationNumber?: string;
  rm?: string;
  upg?: string;
  blockCode?: string;
  fromDate?: string;
  toDate?: string;
  adults?: string;
  children?: string;
  babies?: string;
  rooms?: string;
  rateCode?: string;
  rate?: string;
}

const MONTHS: Record<string, string> = {
  JAN: '01',
  FEB: '02',
  MAR: '03',
  APR: '04',
  MAY: '05',
  JUN: '06',
  JUL: '07',
  AUG: '08',
  SEP: '09',
  OCT: '10',
  NOV: '11',
  DEC: '12',
};

export function normalizeGroupReportRow(raw: RawGroupReportRow): RoomRecord {
  return {
    roomNumber: requiredText(raw.room, 'room'),
    guestName: requiredText(raw.guest, 'guest'),
    reservationNumber: optionalText(raw.reservationNumber),
    bookedRoomType: optionalText(raw.upg),
    actualRoomType: optionalText(raw.rm),
    blockCode: optionalText(raw.blockCode),
    fromDate: normalizeReportDate(raw.fromDate),
    toDate: normalizeReportDate(raw.toDate),
    adults: normalizeInteger(raw.adults),
    children: normalizeInteger(raw.children),
    babies: normalizeInteger(raw.babies),
    rooms: normalizeInteger(raw.rooms),
    rateCode: optionalText(raw.rateCode),
    reportedRate: optionalText(raw.rate),
  };
}

export function normalizeReportDate(value?: string): IsoDate | null {
  const text = optionalText(value);
  if (!text) {
    return null;
  }

  const match = /^(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{2}|\d{4})$/.exec(text);
  if (!match) {
    throw new Error(`Unsupported report date: ${value}`);
  }

  const [, day, monthText, yearText] = match;
  const month = MONTHS[monthText.toUpperCase()];
  if (!month) {
    throw new Error(`Unsupported report month: ${value}`);
  }

  const year = yearText.length === 2 ? `20${yearText}` : yearText;
  return `${year}-${month}-${day.padStart(2, '0')}` as IsoDate;
}

function optionalText(value?: string): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function requiredText(value: string, fieldName: string): string {
  const text = optionalText(value);
  if (!text) {
    throw new Error(`Missing required report field: ${fieldName}`);
  }
  return text;
}

function normalizeInteger(value?: string): number | null {
  const text = optionalText(value);
  if (!text) {
    return null;
  }

  if (!/^\d+$/.test(text)) {
    throw new Error(`Invalid integer report value: ${value}`);
  }

  return Number(text);
}
