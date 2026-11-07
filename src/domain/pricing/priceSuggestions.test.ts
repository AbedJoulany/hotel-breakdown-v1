import { describe, expect, it } from 'vitest';
import { buildPriceSuggestions } from './priceSuggestions';

describe('buildPriceSuggestions', () => {
  it('groups observed prices by the complete date, room, and occupancy rule', () => {
    expect(buildPriceSuggestions([
      { reportDate: '2026-10-24', bookedRoomType: 'STR', actualRoomType: 'STR', adults: 2, children: 1, reportedRate: '125.00' },
      { reportDate: '2026-10-24', bookedRoomType: 'STR', actualRoomType: 'STR', adults: 2, children: 1, reportedRate: '125.00' },
      { reportDate: '2026-10-25', bookedRoomType: 'STR', actualRoomType: 'FAP', adults: 2, children: 1, reportedRate: '125.00' },
    ])).toEqual([
      { reportDate: '2026-10-24', roomType: 'STR', adults: 2, children: 1, rate: '125.00', occurrenceCount: 2 },
      { reportDate: '2026-10-25', roomType: 'STR', adults: 2, children: 1, rate: '125.00', occurrenceCount: 1 },
    ]);
  });

  it('ignores observations without complete rule conditions or numeric rates', () => {
    expect(buildPriceSuggestions([
      { reportDate: '2026-10-24', bookedRoomType: 'STR', actualRoomType: null, adults: null, children: 1, reportedRate: '125' },
      { reportDate: '2026-10-24', bookedRoomType: 'STR', actualRoomType: null, adults: 2, children: 1, reportedRate: 'N/A' },
    ])).toEqual([]);
  });
});
