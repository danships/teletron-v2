import { z } from 'zod';

const nameSchema = z
  .string()
  .min(1)
  .max(63)
  .regex(/^[a-z0-9][a-z0-9-]*$/);

export const nodeNameSchema = nameSchema;
export const capabilityInstanceSchema = nameSchema;
export const nodeIdSchema = z.uuid();
export const sessionIdSchema = z.uuid();
export const tokenIdSchema = z.uuid();

export const capabilityAddressSchema = z.string().refine((value) => {
  const parts = value.split('/');
  return parts.length === 2 && parts.every((part) => nameSchema.safeParse(part).success);
}, 'Invalid capability address');

export type NodeName = z.infer<typeof nodeNameSchema>;
export type CapabilityInstance = z.infer<typeof capabilityInstanceSchema>;
export type CapabilityAddress = z.infer<typeof capabilityAddressSchema>;
export type NodeId = z.infer<typeof nodeIdSchema>;
export type SessionId = z.infer<typeof sessionIdSchema>;
export type TokenId = z.infer<typeof tokenIdSchema>;

/** Builds the canonical node/instance address after validating both parts. */
export function buildCapabilityAddress(nodeName: string, instance: string): CapabilityAddress {
  return capabilityAddressSchema.parse(`${nodeNameSchema.parse(nodeName)}/${capabilityInstanceSchema.parse(instance)}`);
}
