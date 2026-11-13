import type { PricingRule, SupportedCurrency } from '../pricing/pricingRules';
import type { AdditionalChargeRow } from '../charges/models';
import type { ComplimentaryStaffRow } from '../charges/complimentaryStaffModels';
import type { RoomCorrection } from '../reports/roomCorrections';
import type { ActiveReportDocument } from '../reports/models';
import type { RecoveryAdjustment } from '../reports/recoveryAdjustments';
import type { IsoDate } from '../shared/types';

export type ExportLanguage = 'hebrew' | 'usd' | 'english-ils';

export function exportTargetCurrency(language: ExportLanguage): SupportedCurrency {
  return language === 'usd' ? 'USD' : 'ILS';
}
export type IssueSeverity = 'info' | 'warning' | 'final-blocker';
export type IssueAffects = 'data' | 'financial' | 'presentation';
export type PricingStatus = 'resolved' | 'missing-price' | 'pricing-conflict' | 'unresolved';
export type Completeness = 'complete' | 'incomplete';

export type RateValue =
  | { kind: 'numeric'; value: string }
  | { kind: 'missing' }
  | { kind: 'textual'; raw: string };

export type OccupancyCategory =
  | 'single'
  | 'double'
  | 'triple'
  | 'single-child'
  | 'double-child'
  | 'double-two-children'
  | 'unresolved';

export interface ExportIssue {
  code: string;
  severity: IssueSeverity;
  affects: IssueAffects;
  message: string;
  sourceFactIds: string[];
}

export interface ExportSourceRef {
  factId: string;
  reportId: string;
  contentHash: string;
  reportDate: IsoDate;
  groupName: string;
  roomNumber: string;
  sourceRecordIndex: number;
  correctionId: string | null;
}

export interface ExportGroupingKey {
  reportDate: IsoDate;
  bookedRoomType: string | null;
  occupancyCategory: OccupancyCategory;
  rateKey: string;
  currency: SupportedCurrency | null;
}

export interface CanonicalRoomChargeRow {
  groupedRowId: string;
  groupingKey: ExportGroupingKey;
  reportDate: IsoDate;
  bookedRoomType: string | null;
  adults: number | null;
  children: number | null;
  occupancyCategory: OccupancyCategory;
  roomCount: number;
  nights: 1;
  rate: RateValue;
  currency: SupportedCurrency | null;
  pricingStatus: PricingStatus;
  dataCompleteness: Completeness;
  financialCompleteness: Completeness;
  issues: ExportIssue[];
  sourceRefs: ExportSourceRef[];
}

export interface CanonicalAdditionalChargeRow {
  id: string;
  description: string;
  price: RateValue;
  quantity: RateValue;
  number: RateValue;
  currency: SupportedCurrency;
  financialCompleteness: Completeness;
  issues: ExportIssue[];
}

export interface CanonicalComplimentaryStaffRow {
  id: string;
  type: 'free' | 'staff';
  amount: RateValue;
  number: RateValue;
  currency: SupportedCurrency;
  completeness: Completeness;
  issues: ExportIssue[];
}

export interface CanonicalNight {
  reportDate: IsoDate;
  roomCharges: CanonicalRoomChargeRow[];
  dataCompleteness: Completeness;
  financialCompleteness: Completeness;
}

export interface CanonicalExportModel {
  metadata: {
    hotelName: string | null;
    pm?: string | null;
    groupName: string;
    displayReportDate?: IsoDate | null;
    checkInDate: IsoDate | null;
    checkOutDate: IsoDate | null;
    reportDates: IsoDate[];
    currencies: SupportedCurrency[];
  };
  nights: CanonicalNight[];
  additionalCharges?: CanonicalAdditionalChargeRow[];
  complimentaryStaff?: CanonicalComplimentaryStaffRow[];
  warnings: ExportIssue[];
}

export interface ExportBuildInput {
  reports: ActiveReportDocument[];
  selectedGroupName: string;
  corrections: RoomCorrection[];
  pricingRules: PricingRule[];
  additionalCharges?: AdditionalChargeRow[];
  complimentaryStaff?: ComplimentaryStaffRow[];
  recoveryAdjustments?: RecoveryAdjustment[];
  exportMetadata?: {
    hotelName?: string | null;
    pm?: string | null;
    groupName?: string | null;
    reportDate?: IsoDate | null;
  };
}
