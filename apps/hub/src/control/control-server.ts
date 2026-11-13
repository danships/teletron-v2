import { chmod, lstat, unlink } from 'node:fs/promises';
import { createConnection, createServer, type Socket } from 'node:net';
import { parseControlSocket } from '../config/control.js';
import { executeCommand } from '../nodes/node-commands.js';
import type { NodeRepository } from '../nodes/node-repository.js';
import { commandSchema, MAX_BYTES } from './control-messages.js';

async function removeStale(path: string) {
  let entry;
  try {
    entry = await lstat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
  if (!entry.isSocket() || entry.uid !== process.getuid?.()) throw new Error('Control socket path is unsafe');
  const stale = await new Promise<boolean>((resolve) => {
    const probe = createConnection(path);
    probe.on('connect', () => {
      probe.destroy();
      resolve(false);
    });
    probe.on('error', (error: NodeJS.ErrnoException) => resolve(error.code === 'ECONNREFUSED'));
  });
  if (!stale) throw new Error('Control socket is in use');
  const current = await lstat(path);
  if (current.ino !== entry.ino || current.dev !== entry.dev) throw new Error('Control socket path changed');
  await unlink(path);
}

function handle(socket: Socket, nodes: NodeRepository, closeSession: (id: string) => Promise<void>) {
  let input = Buffer.alloc(0);
  let oversized = false;
  socket.on('error', () => undefined);
  socket.on('data', (data: Buffer) => {
    if (input.length + data.length > MAX_BYTES) oversized = true;
    else input = Buffer.concat([input, data]);
  });
  socket.on('end', () => {
    void (async () => {
      let response: unknown = { ok: false, error: 'Invalid command' };
      try {
        const text = input.toString('utf8');
        if (oversized || !text.endsWith('\n') || text.indexOf('\n') !== text.length - 1)
          throw new Error('Invalid frame');
        const command = commandSchema.parse(JSON.parse(text));
        response = await executeCommand(command, nodes, closeSession);
      } catch {
        /* Keep errors safe. */
      }
      socket.end(`${JSON.stringify(response)}\n`);
    })();
  });
}

export async function startControlServer(
  path: string,
  nodes: NodeRepository,
  closeSession: (id: string) => Promise<void>
) {
  await parseControlSocket(path);
  await removeStale(path);
  const server = createServer({ allowHalfOpen: true }, (socket) => handle(socket, nodes, closeSession));
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(path, resolve);
  });
  await chmod(path, 0o600);
  return {
    close: async () => {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    },
  };
}
