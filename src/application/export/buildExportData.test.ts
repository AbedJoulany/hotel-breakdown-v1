import { describe, expect, it } from 'vitest';
import { buildExportData, applyRateOverrides } from './buildExportData';
import type { ActiveReportDocument } from '../../domain/reports/models';
import type { PricingRule } from '../../domain/pricing/pricingRules';

const room = (roomNumber: string, adults: number | null, children: number | null, bookedRoomType = 'STR') => ({
  roomNumber,
  guestName: `Guest ${roomNumber}`,
  reservationNumber: null,
  bookedRoomType,
  actualRoomType: bookedRoomType,
  blockCode: null,
  fromDate: null,
  toDate: null,
  adults,
  children,
  babies: null,
  rooms: 1,
  rateCode: null,
  reportedRate: null,
});

function report(rooms: ReturnType<typeof room>[], reportDate = '2026-10-24'): ActiveReportDocument {
  return {
    id: `report-${reportDate}`,
    reportDate: reportDate as ActiveReportDocument['reportDate'],
    originalFileName: `${reportDate}.pdf`,
    contentHash: `hash-${reportDate}`,
    groupSnapshots: [{ reportId: `group-${reportDate}`, reportDate: reportDate as ActiveReportDocument['reportDate'], groupName: 'Group A', rooms }],
  };
}

const rule = (rate: string, currency: 'ILS' | 'USD' = 'USD'): PricingRule => ({
  id: `rule-${rate}-${currency}`,
  reportDate: '2026-10-24',
  roomType: 'STR',
  adults: 2,
  children: 1,
  rate,
  currency,
});

describe('buildExportData', () => {
  it('uses editable project metadata for export headers without changing report facts', () => {
    const model = buildExportData({
      reports: [report([room('0524', 2, 1)])],
      selectedGroupName: 'Group A',
      corrections: [],
      pricingRules: [rule('100')],
      exportMetadata: { hotelName: 'Orient Jerusalem', groupName: 'Edited Group', pm: '161240141', reportDate: '2026-10-25' },
    });

    expect(model.metadata).toMatchObject({ hotelName: 'Orient Jerusalem', groupName: 'Edited Group', pm: '161240141', displayReportDate: '2026-10-25' });
    expect(model.nights[0]?.reportDate).toBe('2026-10-24');
  });

  it('counts unique rooms and groups identical room-night facts', () => {
    const model = buildExportData({
      reports: [report([room('0524', 2, 1), room('0525', 2, 1)])],
      selectedGroupName: 'Group A',
      corrections: [],
      pricingRules: [rule('100')],
    });

    expect(model.nights[0].roomCharges).toHaveLength(1);
    expect(model.nights[0].roomCharges[0]).toMatchObject({ roomCount: 2, rate: { kind: 'numeric', value: '100' }, pricingStatus: 'resolved' });
    expect(model.nights[0].roomCharges[0].sourceRefs).toHaveLength(2);
  });

  it('keeps missing price as a final blocker without using zero', () => {
    const model = buildExportData({ reports: [report([room('0524', 2, 1)])], selectedGroupName: 'Group A', corrections: [], pricingRules: [] });
    const row = model.nights[0].roomCharges[0];
    expect(row.rate).toEqual({ kind: 'missing' });
    expect(row.pricingStatus).toBe('missing-price');
    expect(row.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'missing-price', severity: 'final-blocker' })]));
    expect(row.financialCompleteness).toBe('incomplete');
  });

  it('accepts zero and negative rates and treats unresolved occupancy separately', () => {
    const zero = buildExportData({ reports: [report([room('0524', 2, 1)])], selectedGroupName: 'Group A', corrections: [], pricingRules: [rule('0')] });
    const negative = buildExportData({ reports: [report([room('0524', 2, 1)])], selectedGroupName: 'Group A', corrections: [], pricingRules: [rule('-10')] });
    const unresolved = buildExportData({ reports: [report([room('0524', null, null)])], selectedGroupName: 'Group A', corrections: [], pricingRules: [] });
    expect(zero.nights[0].roomCharges[0].rate).toEqual({ kind: 'numeric', value: '0' });
    expect(negative.nights[0].roomCharges[0].rate).toEqual({ kind: 'numeric', value: '-10' });
    expect(unresolved.nights[0].roomCharges[0].dataCompleteness).toBe('incomplete');
    expect(unresolved.nights[0].roomCharges[0].issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'unresolved-occupancy', severity: 'final-blocker' })]));
  });

  it('blocks Final for unresolved duplicate-room conflicts', () => {
    const conflicting = report([room('0524', 2, 1), { ...room('0524', 3, 1), rooms: 1 }]);
    const model = buildExportData({ reports: [conflicting], selectedGroupName: 'Group A', corrections: [], pricingRules: [rule('100')] });
    expect(model.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'duplicate-room-conflict', severity: 'final-blocker' })]));
  });

  it('allows a temporary numeric rate override without changing the base model', () => {
    const model = buildExportData({ reports: [report([room('0524', 2, 1)])], selectedGroupName: 'Group A', corrections: [], pricingRules: [] });
    const rowId = model.nights[0].roomCharges[0].groupedRowId;
    const effective = applyRateOverrides(model, new Map([[rowId, '125.50']]));
    expect(model.nights[0].roomCharges[0].pricingStatus).toBe('missing-price');
    expect(effective.nights[0].roomCharges[0]).toMatchObject({ pricingStatus: 'resolved', rate: { kind: 'numeric', value: '125.5' } });
    expect(effective.warnings.some((issue) => issue.code === 'missing-price')).toBe(false);
  });

  it('includes completed additional charges without exporting the untouched starter row', () => {
    const model = buildExportData({
      reports: [report([room('0524', 2, 1)])],
      selectedGroupName: 'Group A',
      corrections: [],
      pricingRules: [rule('100', 'ILS')],
      additionalCharges: [
        { id: 'charge-1', description: 'Breakfast', price: '25', quantity: '2', number: '1', currency: 'ILS' },
        { id: 'starter', description: '', price: '', quantity: '1', number: '1', currency: 'ILS' },
      ],
    });

    expect(model.additionalCharges).toHaveLength(1);
    expect(model.additionalCharges?.[0]).toMatchObject({ description: 'Breakfast', currency: 'ILS', financialCompleteness: 'complete' });
    expect(model.warnings).toHaveLength(0);
  });

  it('includes completed Free and Staff rows as separate export data', () => {
    const model = buildExportData({
      reports: [report([room('0524', 2, 1)])],
      selectedGroupName: 'Group A',
      corrections: [],
      pricingRules: [rule('100', 'ILS')],
      complimentaryStaff: [{ id: 'free-1', type: 'free', amount: '30', number: '2', currency: 'ILS' }],
    });

    expect(model.complimentaryStaff).toHaveLength(1);
    expect(model.complimentaryStaff?.[0]).toMatchObject({ type: 'free', amount: { kind: 'numeric', value: '30' }, number: { kind: 'numeric', value: '2' }, completeness: 'complete' });
    expect(model.warnings).toHaveLength(0);
  });
});
