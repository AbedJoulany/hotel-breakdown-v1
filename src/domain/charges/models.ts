import type { SupportedCurrency } from '../pricing/pricingRules';

export interface AdditionalChargeRow {
  id: string;
  description: string;
  price: string;
  quantity: string;
  number: string;
  currency: SupportedCurrency;
}

export function createAdditionalChargeRow(id = `additional-charge-${Date.now()}`): AdditionalChargeRow {
  return {
    id,
    description: '',
    price: '',
    quantity: '1',
    number: '1',
    currency: 'ILS',
  };
}
