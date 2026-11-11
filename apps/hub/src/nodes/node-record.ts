import { nodeIdSchema, nodeNameSchema, tokenGrantSchema, tokenIdSchema } from '@teletron/protocol';
import { z } from 'zod';

const timestamp = z.iso.datetime();
export const tokenSchema = z.strictObject({
  id: tokenIdSchema,
  token_hash: z.string().regex(/^[a-f0-9]{64}$/),
  grants: tokenGrantSchema,
  created_at: timestamp,
  revoked_at: timestamp.nullable(),
});
export const nodeSchema = z
  .strictObject({
    id: z.string().exactOptional(),
    node_id: nodeIdSchema,
    name: nodeNameSchema,
    created_at: timestamp,
    tokens: z.array(tokenSchema).min(1),
  })
  .refine((node) => node.tokens.filter((token) => token.revoked_at === null).length <= 1)
  .refine((node) => new Set(node.tokens.map((token) => token.id)).size === node.tokens.length)
  .refine((node) => new Set(node.tokens.map((token) => token.token_hash)).size === node.tokens.length);
export type NodeRecord = z.infer<typeof nodeSchema>;
export type TokenRecord = z.infer<typeof tokenSchema>;
