import { randomUUID } from 'node:crypto';
import {
  buildCapabilityAddress,
  decodeJsonMessage,
  decodeSessionMessage,
  PROTOCOL_MAJOR,
  PROTOCOL_VERSION,
  type DisplaySceneSetBody,
  type ErrorCode,
  type HelloBody,
  type SessionMessage,
  type WelcomeBody,
} from '@teletron/protocol';
import { parseConfig } from './config.js';
import { displayManifest } from './manifest.js';
import { ReconnectPolicy } from './reconnect-policy.js';
import { cacheStore } from './state/cache-store.js';
import { applyData, applyScene, resumeState } from './state/display-state.js';

type TerminalStatus = 'unsupported-protocol' | 'unauthorized' | 'frame-limit' | 'replaced';
const terminal = new Map<number, TerminalStatus>([
  [4001, 'unsupported-protocol'],
  [4002, 'unauthorized'],
  [4009, 'frame-limit'],
  [4010, 'replaced'],
]);
export type NodeStatus = TerminalStatus | 'connecting' | 'offline' | 'ready' | 'cache-unavailable';
type Socket = Pick<WebSocket, 'readyState' | 'send' | 'close'> & EventTarget;
type Options = {
  socket?: (url: string) => Socket;
  status?: (status: NodeStatus) => void;
  random?: () => number;
};

export async function startNode(environment: NodeJS.ProcessEnv, options: Options = {}) {
  const config = parseConfig(environment);
  const address = buildCapabilityAddress(config.NODE_NAME, config.NODE_INSTANCE);
  const manifest = displayManifest(config.NODE_INSTANCE);
  const cache = cacheStore(config.NODE_STATE_DIR, config.NODE_ID);
  const label = `Teletron node ${config.NODE_NAME} at ${config.HUB_URL.origin}`;
  const status = options.status ?? ((value: NodeStatus) => console.log(`${label}: ${value}`));
  const policy = new ReconnectPolicy(options.random ?? Math.random, () => performance.now());
  const socket = options.socket ?? ((url) => new WebSocket(url));
  const url = new URL('/ws', config.HUB_URL).href;
  const loaded = await cache.load(address).catch(() => status('cache-unavailable'));
  const display = { address, cache, state: loaded ?? undefined };
  let retry: ReturnType<typeof setTimeout> | undefined;
  let currentSocket: Socket | undefined;
  let stopped = false;

  function connect() {
    if (stopped) return;
    status('connecting');
    const hello: HelloBody = {
      nodeId: config.NODE_ID,
      nodeName: config.NODE_NAME,
      token: config.NODE_TOKEN,
      agentVersion: '0.1.0',
      protocol: PROTOCOL_VERSION,
      manifest,
      resume: resumeState(display.state),
    };
    currentSocket = socket(url);
    new HubSession(currentSocket, hello, display, {
      ready: () => {
        policy.ready();
        status('ready');
      },
      cacheError: () => status('cache-unavailable'),
      closed: (code, pending) => {
        if (stopped) return;
        const blocked = terminal.get(code);
        if (blocked) return status(blocked);
        const delay = policy.next();
        status('offline');
        retry = setTimeout(() => void pending.then(connect), delay);
      },
    });
  }

  connect();
  return () => {
    stopped = true;
    clearTimeout(retry);
    currentSocket?.close();
  };
}

type Display = { address: string; cache: ReturnType<typeof cacheStore>; state: DisplaySceneSetBody | undefined };
type SessionHooks = {
  ready: () => void;
  cacheError: () => void;
  closed: (code: number, pending: Promise<void>) => void;
};

class HubSession {
  private welcome: WelcomeBody | undefined;
  private report: ReturnType<typeof setInterval> | undefined;
  private pending = Promise.resolve();
  private applied = false;

  constructor(
    private readonly socket: Socket,
    hello: HelloBody,
    private readonly display: Display,
    private readonly hooks: SessionHooks
  ) {
    socket.addEventListener('open', () => this.send('hello', hello), { once: true });
    socket.addEventListener('message', (event) => {
      if (event instanceof MessageEvent) this.receive(event.data, hello);
    });
    socket.addEventListener(
      'close',
      (event) => {
        clearInterval(this.report);
        if (event instanceof CloseEvent) this.hooks.closed(event.code, this.pending);
      },
      { once: true }
    );
  }

  private send(type: string, body: unknown, reference?: string) {
    if (this.socket.readyState !== WebSocket.OPEN) return;
    const json = JSON.stringify({ v: PROTOCOL_MAJOR, id: randomUUID(), ts: Date.now(), type, body, ref: reference });
    if (Buffer.byteLength(json) > (this.welcome?.limits.maxJsonBytes ?? 65_536)) this.socket.close(4009);
    else this.socket.send(json);
  }

  private ack() {
    const { address, state } = this.display;
    if (!state) return;
    this.send('display.state', { address, ...resumeState(state), cached: !this.applied });
  }

  private error(code: ErrorCode, reference?: string) {
    this.send('error', { code, message: code, retryable: false }, reference);
  }

  private receive(input: unknown, hello: HelloBody) {
    if (this.socket.readyState !== WebSocket.OPEN) return;
    if (typeof input !== 'string') return this.error('BAD_REQUEST');
    const limit = hello.manifest.limits.maxJsonBytes;
    const decoded = decodeSessionMessage(input, limit);
    if (!decoded.ok) return this.invalidFrame(input, limit, decoded.error.code);
    const frame = decoded.value.known ? decoded.value.message : decoded.value.envelope;
    if (frame.v !== PROTOCOL_MAJOR) return this.socket.close(4001);
    if (decoded.value.known) {
      const { message } = decoded.value;
      if (message.type === 'ping') return this.send('pong', {}, message.id);
      this.pending = this.pending
        .then(() => this.handle(message, hello))
        .catch(() => {
          this.hooks.cacheError();
          this.socket.close(4008);
        });
    } else if (frame.type !== 'error' && decoded.value.handling === 'error') this.error('UNKNOWN_TYPE', frame.id);
  }

  private invalidFrame(input: string, limit: number, code: ErrorCode) {
    if (code === 'LIMIT_EXCEEDED') return this.socket.close(4009);
    const envelope = decodeJsonMessage(input, limit);
    this.error(code, envelope.ok ? envelope.value.id : undefined);
  }

  private async handle(message: SessionMessage, hello: HelloBody) {
    if (this.socket.readyState !== WebSocket.OPEN) return;
    if (message.type === 'welcome') return this.authenticate(message.body, hello);
    if (!this.welcome) return;
    if (message.type === 'session.ready' && !this.report) {
      if (!this.applied) this.ack();
      this.report = setInterval(() => this.ack(), 60_000);
      this.hooks.ready();
    }
    if (message.type === 'display.scene.set' || message.type === 'display.data.update') await this.apply(message);
  }

  private authenticate(welcome: WelcomeBody, hello: HelloBody) {
    if (this.welcome) return;
    if (welcome.protocol !== PROTOCOL_VERSION) return this.socket.close(4001);
    const matchingNode = welcome.nodeId === hello.nodeId && welcome.nodeName === hello.nodeName;
    if (!matchingNode || !welcome.capabilities.granted.includes(this.display.address)) return this.socket.close(4002);
    this.welcome = welcome;
  }

  private async apply(message: Extract<SessionMessage, { type: 'display.scene.set' | 'display.data.update' }>) {
    const generation = this.welcome?.generation;
    const { address, cache, state } = this.display;
    if (!generation || message.body.address !== address) return;
    const next =
      message.type === 'display.scene.set'
        ? applyScene(state, message.body, generation)
        : applyData(state, message.body, generation);
    if (next === 'resync') return this.send('display.resync', { address });
    if (!next) return;
    await cache.save(next);
    this.display.state = next;
    this.applied = true;
    this.ack();
  }
}
