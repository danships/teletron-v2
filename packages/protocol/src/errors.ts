import { z } from 'zod';

export const errorCodeSchema = z.enum([
  'BAD_REQUEST',
  'UNKNOWN_TYPE',
  'UNSUPPORTED_VERSION',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'STALE_REVISION',
  'LIMIT_EXCEEDED',
  'INTERNAL',
]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorBodySchema = z.object({
  code: errorCodeSchema,
  message: z.string().min(1).max(512),
  retryable: z.boolean(),
});

export type ErrorBody = z.infer<typeof errorBodySchema>;

export type ParseFailure = {
  readonly ok: false;
  readonly error: ErrorBody;
};

export type ParseResult<Value> = { readonly ok: true; readonly value: Value } | ParseFailure;

/** Creates a safe protocol parse failure without exposing the rejected input. */
export function parseFailure(code: ErrorCode, message: string, retryable = false): ParseFailure {
  return { ok: false, error: { code, message, retryable } };
}
