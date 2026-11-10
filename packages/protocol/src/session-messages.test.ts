import { describe, expect, it } from 'vitest';

import { decodeSessionMessage, sessionMessageSchema, type SessionMessage } from './index.js';

type IsAny<Value> = 0 extends 1 & Value ? true : false;
type ExpectFalse<Value extends false> = Value;
type SessionBodyIsTyped = ExpectFalse<IsAny<SessionMessage['body']>>;

const nodeId = '52a4574e-9b97-4d34-9fc1-2e681e805d3d';
const sessionId = 'a882f44e-a3de-4713-851c-5f83e03a5652';
const generation = 'f98cc4fa-e34d-4f87-84a2-bef51ac6846e';
const base = { v: 1, id: nodeId, ts: 1_762_516_800_123 };
const manifest = {
  revision: 1,
  kind: 'teletron-pi',
  limits: { maxJsonBytes: 65_536, maxBinaryBytes: 1_048_576 },
  capabilities: [
    {
      type: 'display:web',
      instance: 'hdmi',
      scope: 'local',
      parameters: { target: 'web', viewport: { width: 1920, height: 1080 } },
    },
  ],
};

const validMessages = [
  {
    ...base,
    type: 'hello',
    body: {
      nodeId,
      nodeName: 'living-room-pi',
      token: 'abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE',
      agentVersion: 'teletron-node/0.1.0',
      protocol: '1.0',
      manifest,
      resume: { sceneRev: null, dataRevisions: [] },
    },
  },
  {
    ...base,
    type: 'welcome',
    body: {
      nodeId,
      nodeName: 'living-room-pi',
      protocol: '1.0',
      sessionId,
      generation,
      hubTime: 1_762_516_800_123,
      heartbeat: { intervalMs: 10_000, timeoutMs: 25_000 },
      limits: { maxJsonBytes: 65_536, maxBinaryBytes: 1_048_576 },
      capabilities: { granted: ['living-room-pi/hdmi'], rejected: [] },
    },
  },
  { ...base, type: 'session.ready', body: {} },
  { ...base, type: 'ping', body: {} },
  { ...base, type: 'pong', body: {} },
] as const;

describe('session messages', () => {
  it.each(validMessages)('decodes a valid $type body and strips additive fields', (message) => {
    const typeCheck: SessionBodyIsTyped = false;
    const parsed = sessionMessageSchema.parse({ ...message, body: { ...message.body, future: true } });
    expect(typeCheck).toBe(false);
    expect(parsed).toEqual(message);
  });

  it.each(validMessages)('rejects an invalid $type body', (message) => {
    const result = decodeSessionMessage(JSON.stringify({ ...message, body: [] }), 65_536);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('BAD_REQUEST');
  });

  it.each(validMessages.slice(0, 2))('rejects an invalid $type object body', (message) => {
    const result = decodeSessionMessage(JSON.stringify({ ...message, body: { nodeId: 'x' } }), 65_536);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('BAD_REQUEST');
  });

  it('accepts positive resume revisions and rejects revision zero', () => {
    const hello = validMessages[0];
    if (hello?.type !== 'hello') throw new Error('Missing hello fixture');
    const dataRevision = { moduleId: 'weather', generation, sequence: 1 };
    expect(
      sessionMessageSchema.safeParse({
        ...hello,
        body: { ...hello.body, resume: { sceneRev: 3, dataRevisions: [dataRevision] } },
      }).success
    ).toBe(true);
    expect(
      sessionMessageSchema.safeParse({ ...hello, body: { ...hello.body, resume: { sceneRev: 0, dataRevisions: [] } } })
        .success
    ).toBe(false);
  });

  it('classifies unknown message types without treating them as malformed known messages', () => {
    const ignored = decodeSessionMessage(JSON.stringify({ ...base, type: 'future.state', body: {} }), 65_536);
    const rejected = decodeSessionMessage(JSON.stringify({ ...base, type: 'future.command', body: {} }), 65_536);
    expect(ignored).toMatchObject({ ok: true, value: { known: false, handling: 'ignore' } });
    expect(rejected).toMatchObject({ ok: true, value: { known: false, handling: 'error' } });
  });
});
