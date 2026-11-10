import { z } from 'zod';
import { envelopeSchema } from './envelope.js';
import { capabilityAddressSchema } from './identity.js';
import { moduleIdSchema, sceneSchema } from './scene.js';

const revision = z.number().int().positive();
export const dataRevisionSchema = z.object({ generation: z.uuid(), sequence: revision });
const data = z.record(z.string(), z.unknown());
const snapshot = z.object({ moduleId: moduleIdSchema, dataRev: dataRevisionSchema, data });
export const displaySceneSetBodySchema = z
  .object({
    address: capabilityAddressSchema,
    sceneRev: revision,
    scene: sceneSchema,
    data: z.array(snapshot).max(12).optional(),
  })
  .refine((body) => {
    const ids = body.data?.map((item) => item.moduleId) ?? [];
    return (
      new Set(ids).size === ids.length &&
      ids.every((id) => body.scene.modules.some((module) => module.id === id && module.mode !== 'local'))
    );
  });
export const displayDataUpdateBodySchema = z.object({
  address: capabilityAddressSchema,
  sceneRev: revision,
  moduleId: moduleIdSchema,
  dataRev: dataRevisionSchema,
  data,
});
export const displayStateBodySchema = z.object({
  address: capabilityAddressSchema,
  sceneRev: revision,
  dataRevisions: z.array(dataRevisionSchema.extend({ moduleId: moduleIdSchema })).max(256),
  cached: z.boolean(),
});
export const displayResyncBodySchema = z.object({ address: capabilityAddressSchema });
export const displayMessageSchemas = [
  envelopeSchema.extend({ type: z.literal('display.scene.set'), body: displaySceneSetBodySchema }),
  envelopeSchema.extend({ type: z.literal('display.data.update'), body: displayDataUpdateBodySchema }),
  envelopeSchema.extend({ type: z.literal('display.state'), body: displayStateBodySchema }),
  envelopeSchema.extend({ type: z.literal('display.resync'), body: displayResyncBodySchema }),
] as const;
export const displayMessageSchema = z.discriminatedUnion('type', displayMessageSchemas);
export type DisplayMessage = z.infer<typeof displayMessageSchema>;
export type DataRevision = z.infer<typeof dataRevisionSchema>;
export type DisplaySceneSetBody = z.infer<typeof displaySceneSetBodySchema>;
export type DisplayDataUpdateBody = z.infer<typeof displayDataUpdateBodySchema>;
export type DisplayStateBody = z.infer<typeof displayStateBodySchema>;
export type DisplayResyncBody = z.infer<typeof displayResyncBodySchema>;
