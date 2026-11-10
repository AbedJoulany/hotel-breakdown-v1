import type { SupportedCurrency } from '../pricing/pricingRules';

export type ComplimentaryStaffType = 'free' | 'staff';

export interface ComplimentaryStaffRow {
  id: string;
  type: ComplimentaryStaffType;
  amount: string;
  number: string;
  currency: SupportedCurrency;
}

export function createComplimentaryStaffRow(id = `complimentary-staff-${Date.now()}`): ComplimentaryStaffRow {
  return { id, type: 'free', amount: '', number: '1', currency: 'ILS' };
}
