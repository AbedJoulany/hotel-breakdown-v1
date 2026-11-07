import type { Id, IsoDate } from '../shared/types';

export type SupportedCurrency = 'ILS' | 'USD';

export interface PricingRule {
  id: Id;
  reportDate: IsoDate;
  roomType: string;
  adults: number;
  children: number;
  rate: string;
  currency: SupportedCurrency;
}

export interface PricingMatchContext {
  reportDate: IsoDate;
  roomType: string;
  adults: number | null;
  children: number | null;
}

export interface PricingConflict {
  kind: 'pricing-conflict';
  rules: PricingRule[];
  context: PricingMatchContext;
}

export interface MissingPrice {
  kind: 'missing-price';
  context: PricingMatchContext;
}

export type PricingMatchResult =
  | { kind: 'matched'; rule: PricingRule }
  | PricingConflict
  | MissingPrice;

export function matchPricingRule(
  context: PricingMatchContext,
  rules: PricingRule[],
): PricingMatchResult {
  const matches = rules.filter((rule) => context.adults !== null
    && context.children !== null
    && rule.reportDate === context.reportDate
    && rule.roomType === context.roomType
    && rule.adults === context.adults
    && rule.children === context.children);

  if (matches.length === 1) {
    return { kind: 'matched', rule: matches[0] };
  }
  if (matches.length > 1) {
    return { kind: 'pricing-conflict', rules: matches, context };
  }
  return { kind: 'missing-price', context };
}
