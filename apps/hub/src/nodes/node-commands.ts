import { randomUUID } from 'node:crypto';
import type { Command, Response } from '../control/control-messages.js';
import { createCredential } from './node-credentials.js';
import type { NodeRepository } from './node-repository.js';

export async function executeCommand(
  command: Command,
  nodes: NodeRepository,
  closeTokenSession: (id: string) => Promise<void>
): Promise<Response> {
  try {
    if (command.type === 'node.revoke') {
      await nodes.revoke(command.nodeId, command.tokenId, new Date().toISOString());
      if (!(await closeWithRetry(closeTokenSession, command.tokenId)))
        return { ok: false, error: 'Revoked; session closure failed' };
      console.log(`node.revoke node=${command.nodeId} token=${command.tokenId} success`);
      return { ok: true };
    }
    const credential = createCredential(command.grants);
    const nodeId = command.type === 'node.create' ? randomUUID() : command.nodeId;
    let name: string;
    if (command.type === 'node.create') {
      name = command.name;
      await nodes.create({ node_id: nodeId, name, created_at: new Date().toISOString(), tokens: [credential.record] });
    } else name = await nodes.issue(nodeId, credential.record);
    console.log(`${command.type} node=${nodeId} token=${credential.record.id} success`);
    return { ok: true, nodeId, name, token: credential.token };
  } catch {
    console.error(`${command.type} failed`);
    return { ok: false, error: 'Command failed' };
  }
}

async function closeWithRetry(close: (id: string) => Promise<void>, id: string): Promise<boolean> {
  try {
    await close(id);
    return true;
  } catch {
    try {
      await close(id);
      return true;
    } catch {
      return false;
    }
  }
}
