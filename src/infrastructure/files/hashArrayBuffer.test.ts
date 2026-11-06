import { describe, expect, it } from 'vitest';
import { hashArrayBuffer } from './hashArrayBuffer';

describe('hashArrayBuffer', () => {
  it('returns a stable content hash', async () => {
    const data = new TextEncoder().encode('hotel report').buffer;

    expect(await hashArrayBuffer(data)).toMatch(/^[0-9a-f-]+$/);
    expect(await hashArrayBuffer(data)).toBe(await hashArrayBuffer(data));
  });
});
