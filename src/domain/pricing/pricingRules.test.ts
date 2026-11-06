import { describe, expect, it } from 'vitest';
import { matchPricingRule, type PricingMatchContext, type PricingRule } from './pricingRules';

const context: PricingMatchContext = {
  reportDate: '2026-10-25',
  roomType: 'STR',
  adults: 2,
  children: 1,
};

const rule = (id: string): PricingRule => ({
  id,
  reportDate: '2026-10-25',
  roomType: 'STR',
  adults: 2,
  children: 1,
  rate: id === 'specific' ? '125.50' : '100.00',
  currency: 'ILS',
});

describe('matchPricingRule', () => {
  it('matches only when date, room type, and occupancy all match', () => {
    expect(matchPricingRule(context, [rule('specific')])).toEqual({
      kind: 'matched',
      rule: expect.objectContaining({ id: 'specific' }),
    });
  });

  it('returns Missing Price when any required condition differs', () => {
    expect(matchPricingRule({ ...context, children: 2 }, [rule('specific')])).toMatchObject({
      kind: 'missing-price',
    });
  });

  it('returns Pricing Conflict when more than one rule matches', () => {
    const result = matchPricingRule(context, [rule('one'), rule('two')]);

    expect(result).toMatchObject({ kind: 'pricing-conflict', context });
    expect(result.kind === 'pricing-conflict' ? result.rules.map((item) => item.id) : []).toEqual(['one', 'two']);
  });

  it('does not match when occupancy is unknown', () => {
    expect(matchPricingRule({ ...context, adults: null }, [rule('specific')])).toMatchObject({
      kind: 'missing-price',
    });
  });
});

