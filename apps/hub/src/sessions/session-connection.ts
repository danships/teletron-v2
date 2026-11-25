import { randomUUID } from 'node:crypto';
import type { RawData, WebSocket } from 'ws';
import { authenticate, type Connection } from './session-authenticator.js';
import { ControlQueue } from './control-queue.js';
import { heartbeat } from './heartbeat.js';
import { errorFrame, inputError, route } from './message-router.js';
type Context = Pick<Connection, 'nodes' | 'registry' | 'generation' | 'log'> & {
  cleanup: ((id: string) => void) | undefined;
};
export function attach(socket: WebSocket, context: Context) {
  const state: Connection = {
    ...context,
    id: randomUUID(),
    session: undefined,
    closed: false,
    started: false,
    limit: 65_536,
    ready: () => clearTimeout(deadline),
    close: (code) => socket.close(code),
    send: (message) => {
      const json = JSON.stringify(message);
      if (Buffer.byteLength(json) > state.limit) state.close(4009);
      else if (!state.closed) queue.enqueue(json);
    },
  };
  const originalClose = socket.close.bind(socket);
  // Translate ws's bounded receiver failure into Teletron's frame-limit close code.
  socket.close = (code, data) => {
    cleanup();
    originalClose(code === 1009 ? 4009 : code, data);
  };
  const queue = new ControlQueue((message, done) => {
    if (!state.closed)
      socket.send(message, (error) => {
        if (error) state.close(4008);
        else done();
      });
  }, state.close);
  const beat = heartbeat(() => {
    if (state.session && !state.closed) socket.ping();
  }, state.close);
  const deadline = setTimeout(() => state.close(4002), 5000);
  function cleanup() {
    if (state.closed) return;
    state.closed = true;
    clearTimeout(deadline);
    beat.stop();
    if (state.session) {
      context.registry.remove(state.session);
      context.cleanup?.(state.id);
    }
  }
  socket.on('close', cleanup);
  socket.on('error', () => state.close(4009));
  for (const event of ['ping', 'pong', 'message']) socket.on(event, beat.activity);
  socket.on('message', (data, binary) => handle(data, binary, state));
}
function handle(data: RawData, binary: boolean, state: Connection) {
  if (state.closed) return;
  const input = data.toString();
  if (binary) {
    state.send(errorFrame(state.session ? 'BAD_REQUEST' : 'UNAUTHORIZED'));
    if (!state.session) state.close(4002);
    return;
  }
  if (state.session) {
    route(input, state.session, state.send);
    return;
  }
  if (state.started) {
    state.close(4002);
    return;
  }
  state.started = true;
  void authenticate(input, state).catch(() => {
    state.log({ event: 'unauthorized', sessionId: state.id });
    state.send(inputError('UNAUTHORIZED', input));
    state.close(4002);
  });
}
