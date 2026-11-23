import { once } from 'node:events';
import { envelopeSchema } from '@teletron/protocol';
import { randomUUID } from 'node:crypto';
import type { Repository } from 'supersave';
import { WebSocket } from 'ws';
import { vi, type Mock } from 'vitest';
import { executeCommand } from '../nodes/node-commands.js';
import { createCredential } from '../nodes/node-credentials.js';
import type { NodeRecord } from '../nodes/node-record.js';
import { NodeRepository } from '../nodes/node-repository.js';
import { createSessionServer } from './websocket-server.js';
export function frame<T = Record<string, never>>(type: string, body: T = {} as T) {
  return { v: 1, id: randomUUID(), ts: Date.now(), type, body };
}
const capability = {
  type: 'display:web',
  instance: 'hdmi',
  scope: 'local',
  parameters: { target: 'web', viewport: { width: 800, height: 600 } },
};
export async function fixture() {
  const credential = createCredential(
    ['hdmi', 'other'].map((instance) => ({ type: 'display:web', instance, scope: 'local' }))
  );
  const node = { node_id: randomUUID(), name: 'pi', created_at: new Date().toISOString(), tokens: [credential.record] };
  const storage = {
    getAll: vi.fn<() => Promise<NodeRecord[]>>(async () => structuredClone([node])),
    update: vi.fn<(value: NodeRecord) => Promise<NodeRecord>>(async (value: NodeRecord) => Object.assign(node, value)),
  };
  const nodes = new NodeRepository(storage as unknown as Repository<NodeRecord>);
  const cleanup: Mock<(id: string) => void> = vi.fn();
  const log: Mock<(entry: Record<string, string | number>) => void> = vi.fn();
  const server = createSessionServer(nodes, { cleanup, log });
  await new Promise<void>((resolve) => server.http.listen(0, '127.0.0.1', resolve));
  const address = server.http.address();
  if (!address || typeof address === 'string') throw new Error('No port');
  const connect = async (path = '/ws') => {
    const socket = new WebSocket(`ws://127.0.0.1:${address.port}${path}`, { autoPong: false });
    await once(socket, 'open');
    return socket;
  };
  const hello = () =>
    frame('hello', {
      nodeId: node.node_id,
      nodeName: node.name,
      token: credential.token,
      agentVersion: 'test',
      protocol: '1.0',
      manifest: {
        revision: 1,
        kind: 'pi',
        limits: { maxJsonBytes: 65_536, maxBinaryBytes: 65_536 },
        capabilities: [capability, { ...capability, instance: 'other', scope: 'shared' }],
      },
      resume: { sceneRev: null, dataRevisions: [] },
    });
  const login = async (input = hello()) => {
    const socket = await connect();
    const response = once(socket, 'message');
    socket.send(JSON.stringify(input));
    await response;
    return socket;
  };
  const reject = async (input: unknown, authenticated = false) => {
    const socket = await (authenticated ? login() : connect());
    const closed = once(socket, 'close');
    socket.send(typeof input === 'string' || Buffer.isBuffer(input) ? input : JSON.stringify(input));
    return closeCode(closed);
  };
  const revoke = () =>
    executeCommand({ type: 'node.revoke', nodeId: node.node_id, tokenId: credential.record.id }, nodes, async (id) =>
      server.registry.closeByTokenId(id, 4002)
    );
  return { ...server, connect, login, hello, revoke, reject, credential, node, nodes, storage, cleanup, log };
}
export const closeCode = (promise: Promise<unknown[]>) => promise.then(([code]) => code);
export const receive = (promise: Promise<unknown[]>) =>
  promise.then(([data]) => envelopeSchema.parse(JSON.parse(String(data))));
export const body = (promise: Promise<unknown[]>) => receive(promise).then((message) => message.body);
