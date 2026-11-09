import { z } from 'zod';

import { parseFailure, type ParseResult } from './errors.js';

export const PROTOCOL_MAJOR = 1;
export const PROTOCOL_MINOR = 0;
export const PROTOCOL_VERSION = '1.0' as const;

export const protocolVersionSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)$/)
  .transform((value) => {
    const separator = value.indexOf('.');
    return {
      major: Number(value.slice(0, separator)),
      minor: Number(value.slice(separator + 1)),
    };
  })
  .refine((value) => Number.isSafeInteger(value.major) && Number.isSafeInteger(value.minor));

export type ProtocolVersion = z.infer<typeof protocolVersionSchema>;

/** Parses a major.minor protocol version into validated numeric components. */
export function parseProtocolVersion(input: string): ParseResult<ProtocolVersion> {
  const result = protocolVersionSchema.safeParse(input);
  return result.success ? { ok: true, value: result.data } : parseFailure('BAD_REQUEST', 'Invalid protocol version');
}

/** Negotiates a compatible version within Teletron's supported protocol major. */
export function negotiateProtocolVersion(input: string): ParseResult<string> {
  const parsed = parseProtocolVersion(input);
  if (!parsed.ok) {
    return parsed;
  }

  if (parsed.value.major !== PROTOCOL_MAJOR) {
    return parseFailure('UNSUPPORTED_VERSION', 'Unsupported protocol version');
  }

  return {
    ok: true,
    value: `${PROTOCOL_MAJOR}.${Math.min(parsed.value.minor, PROTOCOL_MINOR)}`,
  };
}
