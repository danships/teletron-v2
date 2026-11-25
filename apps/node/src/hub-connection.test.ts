import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { sessionMessageSchema } from '@teletron/protocol';
import { startNode } from './hub-connection.js';
import { ReconnectPolicy } from './reconnect-policy.js';

const nodeId = '00000000-0000-4000-8000-000000000001';
const generation = '00000000-0000-4000-8000-000000000002';
const nextGeneration = '00000000-0000-4000-8000-000000000003';
const address = 'pi/hdmi';
const token = 'test-node-secret';
const scene = {
  target: 'web',
  theme: 'dark',
  grid: { rows: 1, columns: 1, gap: 'small', padding: 'medium' },
  modules: [
    {
      id: 'weather',
      mode: 'data',
      source: 'weather.home',
      placement: { row: 1, column: 1, rowSpan: 1, columnSpan: 1 },
      component: { type: 'icon', value: { type: 'data', path: 'icon' } },
    },
  ],
};
const snapshot = (sequence: number, epoch = generation) => ({
  moduleId: 'weather',
  dataRev: { generation: epoch, sequence },
  data: { temperature: sequence },
});

class FakeHub extends EventTarget {
  readyState = 0;
  messages: ReturnType<typeof sessionMessageSchema.parse>[] = [];
  send(input: string) {
    this.messages.push(sessionMessageSchema.parse(JSON.parse(input)));
  }
  open() {
    this.readyState = 1;
    this.dispatchEvent(new Event('open'));
  }
  close(code = 1000) {
    this.readyState = 3;
    this.dispatchEvent(new CloseEvent('close', { code, reason: token }));
  }
  frame(type: string, body: unknown = {}) {
    const data = JSON.stringify({ v: 1, id: randomUUID(), ts: Date.now(), type, body });
    this.dispatchEvent(new MessageEvent('message', { data }));
  }
  welcome(epoch = generation) {
    this.frame('welcome', {
      nodeId,
      nodeName: 'pi',
      protocol: '1.0',
      sessionId: randomUUID(),
      generation: epoch,
      hubTime: 0,
      heartbeat: { intervalMs: 10_000, timeoutMs: 25_000 },
      limits: { maxJsonBytes: 65_536, maxBinaryBytes: 65_536 },
      capabilities: { granted: [address], rejected: [] },
    });
  }
  scene(sceneRev: number) {
    const initial = { ...snapshot(9), data: { temperature: 9, previous: true } };
    this.frame('display.scene.set', { address, sceneRev, scene, data: [initial] });
  }
}

let directory: string;
let stop: (() => void) | undefined;
beforeEach(async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'teletron-'));
  directory = path.join(temporary, 'state');
});
afterEach(async () => {
  stop?.();
  stop = undefined;
  vi.useRealTimers();
  await rm(path.dirname(directory), { recursive: true, force: true });
});

function fixture() {
  const hub = new FakeHub();
  const environment = {
    HUB_URL: 'wss://hub.example',
    NODE_ID: nodeId,
    NODE_NAME: 'pi',
    NODE_TOKEN: token,
    NODE_INSTANCE: 'hdmi',
    NODE_STATE_DIR: directory,
    YOUTUBE_API_KEY: 'test-provider-secret',
  };
  const status = vi.fn();
  const socket = vi.fn(() => hub);
  return { hub, environment, socket, status, options: { socket, status, random: () => 0 } };
}

async function start(f: ReturnType<typeof fixture>) {
  stop = await startNode(f.environment, f.options);
  f.hub.open();
}

const cachePath = () => path.join(directory, 'display-cache.json');
const readCache = () => readFile(cachePath(), 'utf8');
const states = (hub: FakeHub) => hub.messages.filter((message) => message.type === 'display.state');

async function seed(f: ReturnType<typeof fixture>, revision: number) {
  await start(f);
  f.hub.welcome();
  f.hub.scene(revision);
  await vi.waitFor(() => expect(states(f.hub)).toHaveLength(1));
  stop?.();
}

it('AT-N01, AT-N08 and AT-N09 resume the private durable cache after an interrupted write', async () => {
  await mkdir(directory, { mode: 0o755 });
  await seed(fixture(), 2);
  const saved = await readCache();
  expect(saved).not.toMatch(/test-node-secret|test-provider-secret/);
  if (process.platform !== 'win32') {
    const [directoryInfo, file] = await Promise.all([stat(directory), stat(cachePath())]);
    expect(directoryInfo.mode & 0o777).toBe(0o700);
    expect(file.mode & 0o777).toBe(0o600);
  }
  await writeFile(path.join(directory, 'display-cache.json.interrupted.tmp'), '{"version":1');
  const resumed = fixture();
  await start(resumed);
  expect(resumed.socket).toHaveBeenCalledWith('wss://hub.example/ws');
  expect(resumed.hub.messages[0]).toMatchObject({
    type: 'hello',
    body: {
      token,
      manifest: { revision: 1, capabilities: [{ type: 'display:web', scope: 'local', instance: 'hdmi' }] },
      resume: { sceneRev: 2, dataRevisions: [{ moduleId: 'weather', generation, sequence: 9 }] },
    },
  });
  resumed.hub.welcome();
  resumed.hub.frame('session.ready');
  await vi.waitFor(() => expect(states(resumed.hub)[0]?.body).toMatchObject({ sceneRev: 2, cached: true }));
  expect(await readCache()).toBe(saved);
  stop?.();
  await writeFile(cachePath(), saved.slice(0, -3));
  const corrupt = fixture();
  await start(corrupt);
  expect(corrupt.status).toHaveBeenCalledWith('cache-unavailable');
  expect(corrupt.hub.messages[0]).toMatchObject({ body: { resume: { sceneRev: null, dataRevisions: [] } } });
});

it('AT-N02 rejects invalid config before cache or socket work and omits the token', async () => {
  const f = fixture();
  for (const patch of [
    { NODE_ID: undefined },
    { NODE_TOKEN: token + '!' },
    { HUB_URL: 'ws://localhost' },
    { HUB_URL: 'wss://hub.example/a/..' },
    { HUB_URL: 'wss://hub.example?' },
    { HUB_URL: 'ws://hub.example', NODE_ENV: 'development' },
  ]) {
    await expect(startNode({ ...f.environment, ...patch }, f.options)).rejects.toThrow(/^Invalid node configuration$/);
  }
  expect(f.socket).not.toHaveBeenCalled();
  await expect(stat(directory)).rejects.toMatchObject({ code: 'ENOENT' });
  const development = { ...f.environment, HUB_URL: 'ws://[::1]:8080', NODE_ENV: 'development' };
  await start({ ...f, environment: development });
  expect(f.socket).toHaveBeenCalledWith('ws://[::1]:8080/ws');
});

it('AT-N03 backs off on transient closes and resets only after 60 seconds ready', async () => {
  let now = 0;
  const policy = new ReconnectPolicy(
    () => 0.5,
    () => now
  );
  expect(Array.from({ length: 7 }, () => policy.next())).toEqual([1250, 2500, 5000, 10_000, 20_000, 37_500, 37_500]);
  policy.ready();
  now = 59_999;
  expect(policy.next()).toBe(37_500);
  policy.ready();
  now += 60_000;
  expect(policy.next()).toBe(1250);
  vi.useFakeTimers();
  const f = fixture();
  await start(f);
  for (const [index, code] of [4004, 4008, 1012].entries()) {
    f.hub.close(code);
    await vi.advanceTimersByTimeAsync(1000 * 2 ** index - 1);
    expect(f.socket).toHaveBeenCalledTimes(index + 1);
    await vi.advanceTimersByTimeAsync(1);
    expect(f.socket).toHaveBeenCalledTimes(index + 2);
  }
});

it.each([
  [4001, 'unsupported-protocol'],
  [4002, 'unauthorized'],
  [4009, 'frame-limit'],
  [4010, 'replaced'],
])('AT-N04 stops on close %i with safe status %s', async (code, status) => {
  vi.useFakeTimers();
  const f = fixture();
  await start(f);
  f.hub.close(code);
  await vi.advanceTimersByTimeAsync(120_000);
  expect(f.socket).toHaveBeenCalledTimes(1);
  expect(f.status).toHaveBeenLastCalledWith(status);
});

it('AT-N05 caches a higher scene before acknowledging and reports state every 60 seconds', async () => {
  vi.useFakeTimers();
  const f = fixture();
  await start(f);
  vi.spyOn(f.hub, 'send').mockImplementation((input) => {
    FakeHub.prototype.send.call(f.hub, input);
    if (input.includes('"display.state"'))
      expect(JSON.parse(readFileSync(cachePath(), 'utf8'))).toMatchObject({ state: { sceneRev: 3 } });
  });
  f.hub.welcome();
  f.hub.scene(3);
  f.hub.frame('ping');
  expect(f.hub.messages.at(-1)?.type).toBe('pong');
  f.hub.frame('session.ready');
  await vi.waitFor(() => expect(f.status).toHaveBeenLastCalledWith('ready'));
  expect(states(f.hub)).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(states(f.hub)).toHaveLength(2);
});

it('AT-N06 and AT-N07 discard stale updates, resume across generations and resync mismatches', async () => {
  await seed(fixture(), 3);
  const resumed = fixture();
  await start(resumed);
  resumed.hub.welcome(nextGeneration);
  resumed.hub.frame('session.ready');
  await vi.waitFor(() => expect(states(resumed.hub)[0]?.body.dataRevisions[0]?.sequence).toBe(9));
  resumed.hub.scene(2);
  const update = (value: ReturnType<typeof snapshot>, sceneRev = 3) =>
    resumed.hub.frame('display.data.update', { address, sceneRev, ...value });
  update(snapshot(1, nextGeneration));
  update(snapshot(1, nextGeneration));
  update(snapshot(10));
  update(snapshot(2, nextGeneration), 2);
  update({ ...snapshot(2, nextGeneration), moduleId: 'unknown' });
  await vi.waitFor(() =>
    expect(resumed.hub.messages.filter((message) => message.type === 'display.resync')).toHaveLength(2)
  );
  expect(states(resumed.hub)).toHaveLength(2);
  const { state } = JSON.parse(await readCache());
  expect(state.data).toEqual([snapshot(1, nextGeneration)]);
});
