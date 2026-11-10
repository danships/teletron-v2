import { z } from 'zod';

import { decodeJsonMessage, envelopeSchema, type Envelope } from './envelope.js';
import { parseFailure, type ParseResult } from './errors.js';
import { capabilityAddressSchema, nodeIdSchema, nodeNameSchema, sessionIdSchema } from './identity.js';
import { manifestSchema, receiveLimitsSchema } from './manifest.js';

const protocolStringSchema = z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
const positiveRevisionSchema = z.number().int().positive();
const dataRevisionSchema = z.object({
  moduleId: z.string().min(1).max(63),
  generation: z.uuid(),
  sequence: positiveRevisionSchema,
});

export const resumeStateSchema = z.object({
  sceneRev: positiveRevisionSchema.nullable(),
  dataRevisions: z.array(dataRevisionSchema).max(256),
});

export const helloBodySchema = z.object({
  nodeId: nodeIdSchema,
  nodeName: nodeNameSchema,
  token: z
    .string()
    .min(1)
    .max(512)
    .regex(/^[A-Za-z0-9_-]+$/),
  agentVersion: z.string().min(1).max(127),
  protocol: protocolStringSchema,
  manifest: manifestSchema,
  resume: resumeStateSchema,
});

export const welcomeBodySchema = z.object({
  nodeId: nodeIdSchema,
  nodeName: nodeNameSchema,
  protocol: protocolStringSchema,
  sessionId: sessionIdSchema,
  generation: z.uuid(),
  hubTime: z.number().int().nonnegative(),
  heartbeat: z.object({ intervalMs: z.number().int().positive(), timeoutMs: z.number().int().positive() }),
  limits: receiveLimitsSchema,
  capabilities: z.object({
    granted: z.array(capabilityAddressSchema).max(256),
    rejected: z.array(capabilityAddressSchema).max(256),
  }),
});

export const sessionReadyBodySchema = z.object({});
export const pingBodySchema = z.object({});
export const pongBodySchema = z.object({});

const helloMessageSchema = envelopeSchema.extend({ type: z.literal('hello'), body: helloBodySchema });
const welcomeMessageSchema = envelopeSchema.extend({ type: z.literal('welcome'), body: welcomeBodySchema });
const sessionReadyMessageSchema = envelopeSchema.extend({
  type: z.literal('session.ready'),
  body: sessionReadyBodySchema,
});
const pingMessageSchema = envelopeSchema.extend({ type: z.literal('ping'), body: pingBodySchema });
const pongMessageSchema = envelopeSchema.extend({ type: z.literal('pong'), body: pongBodySchema });

const sessionMessageSchemas = [
  helloMessageSchema,
  welcomeMessageSchema,
  sessionReadyMessageSchema,
  pingMessageSchema,
  pongMessageSchema,
] as const;

export const sessionMessageSchema = z.discriminatedUnion('type', sessionMessageSchemas);
export type SessionMessage =
  | z.infer<typeof helloMessageSchema>
  | z.infer<typeof welcomeMessageSchema>
  | z.infer<typeof sessionReadyMessageSchema>
  | z.infer<typeof pingMessageSchema>
  | z.infer<typeof pongMessageSchema>;

const knownTypes = new Set<string>(sessionMessageSchemas.map((schema) => schema.shape.type.value));
const ignoredUnknownSuffixes = ['.event', '.update', '.state', '.ack'];

export type DecodedSessionMessage =
  | { readonly known: true; readonly message: SessionMessage }
  | { readonly known: false; readonly handling: 'error' | 'ignore'; readonly envelope: Envelope };

/** Decodes known session bodies and preserves the required handling for unknown types. */
export function decodeSessionMessage(input: string, maxJsonBytes: number): ParseResult<DecodedSessionMessage> {
  const decoded = decodeJsonMessage(input, maxJsonBytes);
  if (!decoded.ok) return decoded;

  if (!knownTypes.has(decoded.value.type)) {
    const handling = ignoredUnknownSuffixes.some((suffix) => decoded.value.type.endsWith(suffix)) ? 'ignore' : 'error';
    return { ok: true, value: { known: false, handling, envelope: decoded.value } };
  }

  const parsed = sessionMessageSchema.safeParse(decoded.value);
  return parsed.success
    ? { ok: true, value: { known: true, message: parsed.data } }
    : parseFailure('BAD_REQUEST', 'Invalid session message');
}

export type HelloBody = z.infer<typeof helloBodySchema>;
export type WelcomeBody = z.infer<typeof welcomeBodySchema>;
export type ResumeState = z.infer<typeof resumeStateSchema>;
