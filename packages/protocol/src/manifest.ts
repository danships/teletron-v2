import { z } from 'zod';

import { capabilityInstanceSchema } from './identity.js';

export const capabilityTypeSchema = z
  .string()
  .min(3)
  .max(127)
  .regex(/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/);

export const capabilityScopeSchema = z.enum(['local', 'shared']);

export const receiveLimitsSchema = z.object({
  maxJsonBytes: z.number().int().positive(),
  maxBinaryBytes: z.number().int().positive(),
});

export const displayWebParametersSchema = z.object({
  target: z.literal('web'),
  viewport: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
});

const capabilityBase = {
  instance: capabilityInstanceSchema,
  scope: capabilityScopeSchema,
};

export const displayWebCapabilitySchema = z.object({
  type: z.literal('display:web'),
  ...capabilityBase,
  parameters: displayWebParametersSchema,
});

const unknownCapabilitySchema = z
  .object({
    type: capabilityTypeSchema,
    ...capabilityBase,
    parameters: z.record(z.string(), z.unknown()),
  })
  .refine((capability) => capability.type !== 'display:web');

export const capabilitySchema = z.union([displayWebCapabilitySchema, unknownCapabilitySchema]);

export const manifestSchema = z
  .object({
    revision: z.number().int().positive(),
    kind: z.string().min(1).max(127),
    limits: receiveLimitsSchema,
    capabilities: z.array(capabilitySchema).max(256),
  })
  .superRefine((manifest, context) => {
    const seen = new Set<string>();
    for (const [index, capability] of manifest.capabilities.entries()) {
      const key = `${capability.type}\0${capability.instance}`;
      if (seen.has(key)) {
        context.addIssue({ code: 'custom', message: 'Duplicate capability', path: ['capabilities', index] });
      }
      seen.add(key);
    }
  });

const tokenGrantEntrySchema = z
  .object({
    type: capabilityTypeSchema,
    instance: capabilityInstanceSchema,
    scope: capabilityScopeSchema,
  })
  .strict();

export const tokenGrantSchema = z
  .array(tokenGrantEntrySchema)
  .max(256)
  .superRefine((grants, context) => {
    const seen = new Set<string>();
    for (const [index, grant] of grants.entries()) {
      const key = `${grant.type}\0${grant.instance}`;
      if (seen.has(key)) context.addIssue({ code: 'custom', message: 'Duplicate grant', path: [index] });
      seen.add(key);
    }
  });

export type ReceiveLimits = z.infer<typeof receiveLimitsSchema>;
export type DisplayWebParameters = z.infer<typeof displayWebParametersSchema>;
export type Capability = z.infer<typeof capabilitySchema>;
export type Manifest = z.infer<typeof manifestSchema>;
export type TokenGrants = z.infer<typeof tokenGrantSchema>;

/** Divides manifest instances by exact token grant without creating pending state. */
export function classifyManifestGrants(manifest: Manifest, grants: TokenGrants) {
  const exactGrants = new Set(grants.map((grant) => `${grant.type}\0${grant.instance}\0${grant.scope}`));
  const result: { granted: string[]; rejected: string[] } = { granted: [], rejected: [] };
  for (const capability of manifest.capabilities) {
    const key = `${capability.type}\0${capability.instance}\0${capability.scope}`;
    result[exactGrants.has(key) ? 'granted' : 'rejected'].push(capability.instance);
  }
  return result;
}
