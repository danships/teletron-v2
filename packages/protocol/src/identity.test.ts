import { describe, expect, it } from 'vitest';

import { buildCapabilityAddress, capabilityAddressSchema, nodeNameSchema } from './index.js';

describe('node identity', () => {
  it('builds an address from valid names', () => {
    expect(buildCapabilityAddress('living-room-pi', 'hdmi')).toBe('living-room-pi/hdmi');
    expect(capabilityAddressSchema.parse('living-room-pi/hdmi')).toBe('living-room-pi/hdmi');
  });

  it.each(['', '-node', 'Node', 'node_name', `n${'a'.repeat(63)}`])('rejects invalid name %j', (name) => {
    expect(nodeNameSchema.safeParse(name).success).toBe(false);
  });

  it('rejects an invalid address part', () => {
    expect(() => buildCapabilityAddress('living-room-pi', '')).toThrow();
    expect(capabilityAddressSchema.safeParse('living-room-pi/HDMI').success).toBe(false);
  });
});
