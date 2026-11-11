import { nodeIdSchema, nodeNameSchema, tokenGrantSchema, tokenIdSchema } from '@teletron/protocol';
import { z } from 'zod';

export const commandSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('node.create'), name: nodeNameSchema, grants: tokenGrantSchema }),
  z.strictObject({ type: z.literal('node.revoke'), nodeId: nodeIdSchema, tokenId: tokenIdSchema }),
  z.strictObject({ type: z.literal('node.issue-token'), nodeId: nodeIdSchema, grants: tokenGrantSchema }),
]);
export type Command = z.infer<typeof commandSchema>;
export const responseSchema = z.union([
  z.strictObject({ ok: z.literal(false), error: z.string() }),
  z.strictObject({ ok: z.literal(true) }),
  z.strictObject({ ok: z.literal(true), nodeId: nodeIdSchema, name: nodeNameSchema, token: z.string() }),
]);
export type Response = z.infer<typeof responseSchema>;
export const MAX_BYTES = 32 * 1024;
