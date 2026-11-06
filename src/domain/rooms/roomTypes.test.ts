import { describe, expect, it } from 'vitest';
import { findRoomType, ROOM_TYPES } from './roomTypes';

describe('ROOM_TYPES', () => {
  it('contains the approved room type catalog', () => {
    expect(ROOM_TYPES).toHaveLength(15);
    expect(findRoomType('STR')).toEqual({
      code: 'STR',
      en: 'Orient Room',
      he: 'חדר אוריינט',
    });
  });

  it('preserves the intentionally empty Hebrew label for STRC', () => {
    expect(findRoomType('STRC')?.he).toBe('');
  });

  it('returns undefined for an unknown code', () => {
    expect(findRoomType('UNKNOWN')).toBeUndefined();
  });
});

