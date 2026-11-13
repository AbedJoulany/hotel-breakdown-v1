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
  fromDate?: IsoDate | null;
  toDate?: IsoDate | null;
}

export type FolioComparisonStatus =
  | 'matched'
  | 'amount-mismatch'
  | 'missing-in-folio'
  | 'missing-in-group'
  | 'incomplete-group-report'
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
  missingGroupReportDates?: IsoDate[];
  coverageWarning?: 'possible-incomplete-coverage';
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
  missingGroupReportDates?: IsoDate[];
  coverageWarning?: 'possible-incomplete-coverage';
}
