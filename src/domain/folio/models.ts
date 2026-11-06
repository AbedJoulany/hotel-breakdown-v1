import type { IsoDate } from '../shared/types';
import type { SupportedCurrency } from '../pricing/pricingRules';

export interface FolioEntry {
  roomNumber: string;
  guestName: string;
  transactionDate: IsoDate;
  description: string;
  charges: string | null;
  credits: string | null;
  nights: number | null;
  currency: SupportedCurrency;
}

export interface GroupRoomForFolioComparison {
  reportDate: IsoDate;
  roomNumber: string;
  guestName: string;
  reportedRate: string | null;
}

export type FolioComparisonStatus =
  | 'matched'
  | 'amount-mismatch'
  | 'missing-in-folio'
  | 'missing-in-group'
  | 'data-missing';

export interface FolioComparisonResult {
  reportDate: IsoDate;
  roomNumber: string;
  guestName: string;
  groupNightCount: number;
  folioNightCount: number | null;
  folioEntryCount: number;
  groupAmount: string | null;
  folioAmount: string | null;
  currency: SupportedCurrency | null;
  status: FolioComparisonStatus;
}

export interface FolioStayComparisonResult {
  roomNumber: string;
  guestName: string;
  groupNightCount: number;
  folioNightCount: number | null;
  folioEntryCount: number;
  groupAmount: string | null;
  folioAmount: string | null;
  currency: SupportedCurrency | null;
  status: FolioComparisonStatus;
}

