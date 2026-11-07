import { describe, expect, it } from 'vitest';
import { groupMatchKey } from './groupMatch';

describe('groupMatchKey', () => {
  it('matches names that differ only by surrounding or repeated whitespace', () => {
    expect(groupMatchKey('  Etgar-Nof   Va Yam  ')).toBe('etgar-nof va yam');
  });

  it('matches names that differ only by letter case', () => {
    expect(groupMatchKey('FIDF Young Leadership')).toBe('fidf young leadership');
    expect(groupMatchKey('fidf young leadership')).toBe('fidf young leadership');
  });

  it('keeps materially different names separate', () => {
    expect(groupMatchKey('Orient Group A')).not.toBe(groupMatchKey('Orient Group B'));
    expect(groupMatchKey('Orient-Group')).not.toBe(groupMatchKey('Orient Group'));
  });
});
