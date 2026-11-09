import { z } from 'zod';

import { parseFailure, type ParseResult } from './errors.js';

const messageTypeSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)*$/);

export const envelopeSchema = z.object({
  v: z.number().int().positive(),
  type: messageTypeSchema,
  id: z.uuid(),
  ref: z.uuid().optional(),
  ts: z.number().int().nonnegative(),
  body: z.object({}),
});

export type Envelope = z.infer<typeof envelopeSchema>;

export function decodeJsonMessage(input: string, maxJsonBytes: number): ParseResult<Envelope> {
  if (!Number.isSafeInteger(maxJsonBytes) || maxJsonBytes <= 0) {
    return parseFailure('BAD_REQUEST', 'Invalid JSON limit');
  }

  if (new TextEncoder().encode(input).byteLength > maxJsonBytes) {
    return parseFailure('LIMIT_EXCEEDED', 'JSON message exceeds negotiated limit');
  }

  try {
    const parsed: unknown = JSON.parse(input);
    const result = envelopeSchema.safeParse(parsed);
    return result.success ? { ok: true, value: result.data } : parseFailure('BAD_REQUEST', 'Invalid JSON message');
  } catch {
    return parseFailure('BAD_REQUEST', 'Invalid JSON message');
  }
}
