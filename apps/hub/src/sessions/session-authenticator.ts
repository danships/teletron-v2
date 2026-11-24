import { createHash } from 'node:crypto';
import { classifyManifestGrants, decodeSessionMessage, negotiateProtocolVersion } from '@teletron/protocol';
import type { NodeRepository } from '../nodes/node-repository.js';
import { envelope, errorFrame } from './message-router.js';
import type { Log, Session, SessionRegistry } from './session-registry.js';
export type Connection = Pick<Session, 'id' | 'close'> & {
  nodes: NodeRepository;
  registry: SessionRegistry;
  log: Log;
  generation: string;
  session: Session | undefined;
  closed: boolean;
  started: boolean;
  limit: number;
  ready: () => void;
  send: (message: unknown) => void;
};
export async function authenticate(input: string, context: Connection) {
  const decoded = decodeSessionMessage(input, 65_536);
  if (!decoded.ok || !decoded.value.known || decoded.value.message.type !== 'hello') throw new Error('Unauthorized');
  const hello = decoded.value.message;
  const body = hello.body;
  const hash = createHash('sha256').update(body.token).digest('hex');
  await context.nodes.authenticate(hash, ({ node, token }) => {
    if (context.closed) return;
    if (node.node_id !== body.nodeId || node.name !== body.nodeName) throw new Error('Unauthorized');
    const protocol = negotiateProtocolVersion(body.protocol);
    if (!protocol.ok || hello.v !== 1) {
      context.send(errorFrame('UNSUPPORTED_VERSION', hello.id));
      context.close(4001);
      return;
    }
    const capabilities = classifyManifestGrants(body.manifest, token.grants, node.name);
    const displayGrants = token.grants.filter((grant) => grant.type === 'display:web');
    const session: Session = {
      id: context.id,
      tokenId: token.id,
      nodeId: node.node_id,
      displayAddresses: classifyManifestGrants(body.manifest, displayGrants, node.name).granted,
      close: context.close,
    };
    context.session = session;
    context.limit = Math.min(65_536, body.manifest.limits.maxJsonBytes);
    context.ready();
    context.registry.install(session);
    const welcome = {
      nodeId: node.node_id,
      nodeName: node.name,
      protocol: protocol.value,
      sessionId: context.id,
      generation: context.generation,
      hubTime: Date.now(),
      heartbeat: { intervalMs: 10_000, timeoutMs: 25_000 },
      limits: {
        maxJsonBytes: Math.min(65_536, body.manifest.limits.maxJsonBytes),
        maxBinaryBytes: Math.min(65_536, body.manifest.limits.maxBinaryBytes),
      },
      capabilities,
    };
    context.send(envelope('welcome', welcome, hello.id));
  });
}
