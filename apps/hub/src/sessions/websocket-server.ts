import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import type { NodeRepository } from '../nodes/node-repository.js';
import { SessionRegistry, type Log } from './session-registry.js';
import { attach } from './session-connection.js';
export function createSessionServer(
  nodes: NodeRepository,
  options: { cleanup?: (id: string) => void; log?: Log } = {}
) {
  const log = options.log ?? ((entry) => console.log(JSON.stringify(entry)));
  const registry = new SessionRegistry(log);
  const generation = randomUUID();
  let stopping = false;
  const http = createServer((_request, response) => {
    response.writeHead(404).end();
  });
  const ws = new WebSocketServer({ noServer: true, maxPayload: 65_536, perMessageDeflate: false });
  http.on('upgrade', (request, socket, head) => {
    if (stopping || request.url !== '/ws') {
      socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      return;
    }
    ws.handleUpgrade(request, socket, head, (client) => ws.emit('connection', client));
  });
  ws.on('connection', (socket) => attach(socket, { nodes, registry, generation, log, cleanup: options.cleanup }));
  return {
    http,
    registry,
    close: async () => {
      stopping = true;
      for (const socket of ws.clients) socket.close(1012);
      await new Promise<void>((resolve) => ws.close(() => resolve()));
      if (http.listening) await new Promise<void>((resolve) => http.close(() => resolve()));
    },
  };
}
