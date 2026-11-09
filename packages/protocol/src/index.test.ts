import { describe, expect, it } from 'vitest';

import { PROTOCOL_VERSION } from './index.js';

describe('protocol', () => {
  it('starts at version 0 until the slice 1 envelope is approved', () => {
    expect(PROTOCOL_VERSION).toBe(0);
  });
});
