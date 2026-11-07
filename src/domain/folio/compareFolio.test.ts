import { describe, expect, it } from 'vitest';
import { compareFolioToGroup, summarizeFolioStayComparison } from './compareFolio';
import type { FolioEntry, GroupRoomForFolioComparison } from './models';

const groupRooms: GroupRoomForFolioComparison[] = [
  { reportDate: '2026-10-25', roomNumber: '0105', guestName: 'Eliezer Avital', reportedRate: '1,880.00' },
  { reportDate: '2026-10-25', roomNumber: '0105', guestName: 'Shared row', reportedRate: '1,880.00' },
  { reportDate: '2026-10-26', roomNumber: '0105', guestName: 'Eliezer Avital', reportedRate: '2,000.00' },
  { reportDate: '2026-10-25', roomNumber: '0305', guestName: 'Rami Hindi', reportedRate: '1,745.00' },
  { reportDate: '2026-10-25', roomNumber: '0524', guestName: 'Batiya Sarira', reportedRate: null },
];

const folioEntries: FolioEntry[] = [
  { roomNumber: '0105', guestName: 'Eliezer Avital', transactionDate: '2026-10-25', description: '0105 Eliezer Avital', charges: '1,880.00', credits: null, nights: null, currency: 'ILS' },
  { roomNumber: '0305', guestName: 'Rami Hindi', transactionDate: '2026-10-25', description: '0305 Rami Hindi', charges: '1,700.00', credits: null, nights: null, currency: 'ILS' },
  { roomNumber: '0909', guestName: 'Folio only', transactionDate: '2026-10-25', description: '0909 Folio only', charges: '100.00', credits: null, nights: null, currency: 'ILS' },
];

describe('compareFolioToGroup', () => {
  it('matches shared group rooms once and reports comparison statuses', () => {
    expect(compareFolioToGroup(groupRooms, folioEntries, 'ILS')).toEqual([
      { reportDate: '2026-10-25', roomNumber: '0105', guestName: 'Eliezer Avital', groupNightCount: 2, folioNightCount: null, folioEntryCount: 1, groupAmount: '1,880.00', folioAmount: '1880.00', currency: 'ILS', status: 'matched' },
      { reportDate: '2026-10-25', roomNumber: '0305', guestName: 'Rami Hindi', groupNightCount: 1, folioNightCount: null, folioEntryCount: 1, groupAmount: '1,745.00', folioAmount: '1700.00', currency: 'ILS', status: 'amount-mismatch' },
      { reportDate: '2026-10-25', roomNumber: '0524', guestName: 'Batiya Sarira', groupNightCount: 1, folioNightCount: null, folioEntryCount: 0, groupAmount: null, folioAmount: null, currency: 'ILS', status: 'missing-in-folio' },
      { reportDate: '2026-10-25', roomNumber: '0909', guestName: 'Folio only', groupNightCount: 0, folioNightCount: null, folioEntryCount: 1, groupAmount: null, folioAmount: '100.00', currency: 'ILS', status: 'missing-in-group' },
      { reportDate: '2026-10-26', roomNumber: '0105', guestName: 'Eliezer Avital', groupNightCount: 2, folioNightCount: null, folioEntryCount: 1, groupAmount: '2,000.00', folioAmount: null, currency: 'ILS', status: 'missing-in-folio' },
    ]);
  });

  it('reports missing data when a group rate is absent', () => {
    const result = compareFolioToGroup(
      [{ reportDate: '2026-10-25', roomNumber: '0524', guestName: 'Batiya Sarira', reportedRate: null }],
      [{ ...folioEntries[0], roomNumber: '0524' }],
      'ILS',
    );
    expect(result[0].status).toBe('data-missing');
  });

  it('counts reversed guest-name parts as the same stay for night totals', () => {
    const result = compareFolioToGroup(
      [
        { reportDate: '2026-10-24', roomNumber: '0524', guestName: 'Sarira Batiya', reportedRate: '2,375.00' },
        { reportDate: '2026-10-25', roomNumber: '0524', guestName: 'Sarira Batiya', reportedRate: '2,375.00' },
      ],
      [{ ...folioEntries[0], roomNumber: '0524', guestName: 'Batiya Sarira', transactionDate: '2026-10-25', charges: '4,750.00' }],
      'ILS',
    );

    expect(result).toMatchObject([
      { reportDate: '2026-10-24', roomNumber: '0524', groupNightCount: 2, folioNightCount: null, folioEntryCount: 1, status: 'missing-in-folio' },
      { reportDate: '2026-10-25', roomNumber: '0524', groupNightCount: 2, folioNightCount: null, folioEntryCount: 1, status: 'amount-mismatch' },
    ]);
  });

  it('does not compare entries from another currency', () => {
    expect(compareFolioToGroup(
      [{ reportDate: '2026-10-25', roomNumber: '0105', guestName: 'Eliezer Avital', reportedRate: '1,880.00' }],
      [{ ...folioEntries[0], currency: 'USD' }],
      'ILS',
    )[0].status).toBe('missing-in-folio');
  });

  it('summarizes nights and amounts once per room and guest across report dates', () => {
    expect(summarizeFolioStayComparison(
      [
        { reportDate: '2026-10-24', roomNumber: '0524', guestName: 'Sarira Batiya', reportedRate: '2,375.00' },
        { reportDate: '2026-10-25', roomNumber: '0524', guestName: 'Sarira Batiya', reportedRate: '2,375.00' },
      ],
      [{ ...folioEntries[0], roomNumber: '0524', guestName: 'Batiya Sarira', transactionDate: '2026-10-25', charges: '4,750.00' }],
      'ILS',
    )).toEqual([{
      roomNumber: '0524',
      guestName: 'Sarira Batiya',
      groupNightCount: 2,
      folioNightCount: null,
      folioEntryCount: 1,
      groupAmount: '4750.00',
      folioAmount: '4750.00',
      currency: 'ILS',
      status: 'matched',
    }]);
  });

  it('treats a one-minor-unit difference as matched', () => {
    const result = summarizeFolioStayComparison(
      [{ reportDate: '2026-10-25', roomNumber: '0524', guestName: 'Sarira Batiya', reportedRate: '4,750.00' }],
      [{ ...folioEntries[0], roomNumber: '0524', guestName: 'Batiya Sarira', charges: '4,750.01' }],
      'ILS',
    );
    expect(result[0].status).toBe('matched');
  });

  it('keeps a difference above the tolerance as an amount warning', () => {
    const result = summarizeFolioStayComparison(
      [{ reportDate: '2026-10-25', roomNumber: '0524', guestName: 'Sarira Batiya', reportedRate: '4,750.00' }],
      [{ ...folioEntries[0], roomNumber: '0524', guestName: 'Batiya Sarira', charges: '4,750.02' }],
      'ILS',
    );
    expect(result[0].status).toBe('amount-mismatch');
  });
});
