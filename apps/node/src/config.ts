import { isIP } from 'node:net';
import { capabilityInstanceSchema, helloBodySchema } from '@teletron/protocol';
import { z } from 'zod';

const origin = /^wss?:\/\/[^/@?#\\\s]+\/?$/;
const stateDirectory = z.string().refine((value) => value.trim().length > 0 && !value.includes('\0'));

const configSchema = z
  .object({
    HUB_URL: z
      .url()
      .regex(origin)
      .transform((value) => new URL(value)),
    NODE_ID: helloBodySchema.shape.nodeId,
    NODE_NAME: helloBodySchema.shape.nodeName,
    NODE_TOKEN: helloBodySchema.shape.token,
    NODE_INSTANCE: capabilityInstanceSchema,
    NODE_STATE_DIR: stateDirectory,
    NODE_ENV: z.string().optional(),
  })
  .refine(({ HUB_URL, NODE_ENV }) => {
    if (HUB_URL.protocol === 'wss:') return true;
    if (NODE_ENV !== 'development') return false;
    const host = HUB_URL.hostname;
    return host === 'localhost' || host === '[::1]' || (isIP(host) === 4 && host.startsWith('127.'));
  });

export type NodeConfig = z.infer<typeof configSchema>;

export function parseConfig(environment: NodeJS.ProcessEnv): NodeConfig {
  const parsed = configSchema.safeParse(environment);
  if (!parsed.success) throw new Error('Invalid node configuration');
  return parsed.data;
}
