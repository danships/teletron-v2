import { describe, expect, it } from 'vitest';

import { classifyManifestGrants, manifestSchema, tokenGrantSchema } from './index.js';

const displayCapability = {
  type: 'display:web',
  instance: 'hdmi',
  scope: 'local',
  parameters: { target: 'web', viewport: { width: 1920, height: 1080 }, future: true },
};

const manifest = {
  revision: 1,
  kind: 'teletron-pi',
  limits: { maxJsonBytes: 65_536, maxBinaryBytes: 1_048_576 },
  capabilities: [displayCapability],
};

describe('capability manifest', () => {
  it('retains a valid display capability and strips additive known parameter fields', () => {
    expect(manifestSchema.parse(manifest)).toEqual({
      ...manifest,
      capabilities: [{ ...displayCapability, parameters: { target: 'web', viewport: { width: 1920, height: 1080 } } }],
    });
  });

  it.each([
    { ...manifest, revision: 0 },
    { ...manifest, limits: { ...manifest.limits, maxJsonBytes: -1 } },
    { ...manifest, capabilities: [displayCapability, displayCapability] },
  ])('rejects invalid revisions, limits, and duplicate capability pairs', (value) => {
    expect(manifestSchema.safeParse(value).success).toBe(false);
  });

  it('preserves parameters for an additive unknown capability type', () => {
    const capability = { type: 'sensor:air', instance: 'inside', scope: 'shared', parameters: { unit: 'ppm' } };
    expect(manifestSchema.parse({ ...manifest, capabilities: [capability] }).capabilities[0]).toEqual(capability);
  });
});

describe('token grants', () => {
  it('is strict and rejects duplicate grants', () => {
    const grant = { type: 'display:web', instance: 'hdmi', scope: 'local' };
    expect(tokenGrantSchema.safeParse([{ ...grant, extra: true }]).success).toBe(false);
    expect(tokenGrantSchema.safeParse([grant, grant]).success).toBe(false);
  });

  it('grants only an exact type, instance, and scope match', () => {
    const extra = { type: 'sensor:air', instance: 'inside', scope: 'shared', parameters: {} };
    const ungranted = { type: 'sensor:temperature', instance: 'outside', scope: 'local', parameters: {} };
    const result = classifyManifestGrants(
      manifestSchema.parse({ ...manifest, capabilities: [displayCapability, extra, ungranted] }),
      tokenGrantSchema.parse([
        { type: 'display:web', instance: 'hdmi', scope: 'local' },
        { type: 'sensor:air', instance: 'inside', scope: 'local' },
      ])
    );

    expect(result).toEqual({ granted: ['hdmi'], rejected: ['inside', 'outside'] });
    expect(result).not.toHaveProperty('pending');
  });
});
