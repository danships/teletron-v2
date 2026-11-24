import { once } from 'node:events';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { welcomeBodySchema } from '@teletron/protocol';
import { fixture, frame, closeCode, request } from './session.fixture.js';
import { ControlQueue } from './control-queue.js';
import { parseHubPort } from '../config/hub.js';

let f: Awaited<ReturnType<typeof fixture>>;
beforeEach(async () => {
  f = await fixture();
});
afterEach(async () => {
  vi.useRealTimers();
  await f.close();
});
const tick = async () => {
  for (let index = 0; index < 12; index++) await new Promise(setImmediate);
};
it('AT-H01 rejects a silent or non-hello first frame, including binary', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  const silent = await f.connect();
  const closed = once(silent, 'close');
  await vi.advanceTimersByTimeAsync(5000);
  expect(await closeCode(closed)).toBe(4002);
  vi.useRealTimers();
  for (const input of [JSON.stringify(frame('ping')), Buffer.from('binary')]) expect(await f.reject(input)).toBe(4002);
});
it('AT-H02 returns only safe unauthorized errors for every credential mismatch', async () => {
  for (const patch of [
    { token: 'unknown' },
    { token: '!' },
    { nodeId: '00000000-0000-4000-8000-000000000000' },
    { nodeName: 'wrong' },
  ]) {
    const socket = await f.connect();
    const closed = once(socket, 'close');
    const hello = f.hello();
    Object.assign(hello.body, patch);
    const unauthorized = { code: 'UNAUTHORIZED', message: 'UNAUTHORIZED', retryable: false };
    expect(await request(socket, hello).then((message) => message.body)).toEqual(unauthorized);
    expect(await closeCode(closed)).toBe(4002);
  }
  await f.nodes.revoke(f.node.node_id, f.credential.record.id, new Date().toISOString());
  expect(await f.reject(f.hello())).toBe(4002);
});
it('AT-H03/H04 welcomes canonical identity and exact grants, denying scope escalation', async () => {
  const socket = await f.connect();
  const hello = f.hello();
  hello.body.manifest.capabilities.push({ ...hello.body.manifest.capabilities[1]!, instance: 'shared' });
  const welcome = await request(socket, hello).then((message) => welcomeBodySchema.parse(message.body));
  expect(welcome).toMatchObject({
    nodeId: f.node.node_id,
    nodeName: 'pi',
    protocol: '1.0',
    heartbeat: { intervalMs: 10_000, timeoutMs: 25_000 },
    capabilities: { granted: ['pi/hdmi'], rejected: ['pi/other', 'pi/shared'] },
  });
  expect(f.registry.current(f.credential.record.id)?.displayAddresses).toEqual(['pi/hdmi']);
  f.credential.record.grants[0]!.type = 'sensor:temperature';
  hello.body.manifest.capabilities.push({ ...hello.body.manifest.capabilities[0]!, type: 'sensor:temperature' });
  const denied = await f.login(hello);
  const forbidden = await request(denied, frame('display.resync', { address: 'pi/hdmi' }));
  expect(forbidden.body).toMatchObject({ code: 'FORBIDDEN' });
});
it('AT-H05 installs takeover before old cleanup, with secret-free structured logs', async () => {
  const old = await f.login();
  const closed = once(old, 'close');
  const prior = f.registry.current(f.credential.record.id)?.id;
  await f.login();
  expect(await closeCode(closed)).toBe(4010);
  expect(f.registry.current(f.credential.record.id)?.id).not.toBe(prior);
  expect(f.cleanup).toHaveBeenCalledTimes(1);
  const takeover = { event: 'takeover', tokenId: f.credential.record.id, oldSessionId: prior };
  expect(f.log).toHaveBeenCalledWith(expect.objectContaining(takeover));
  expect(f.log.mock.calls.map(([entry]) => entry['event'])).toEqual(['present', 'present', 'takeover', 'absent']);
  expect(JSON.stringify(f.log.mock.calls)).not.toContain(f.credential.token);
});
it('AT-H06 removes presence and subscriptions immediately at the 25-second timeout', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  const socket = await f.login();
  const closed = once(socket, 'close');
  await vi.advanceTimersByTimeAsync(25_000);
  expect(f.registry.current(f.credential.record.id)).toBeUndefined();
  expect(f.cleanup).toHaveBeenCalledTimes(1);
  expect(await closeCode(closed)).toBe(4004);
});
it('AT-H07 keeps sessions alive with frames, transport pongs and JSON ping/pong', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  const socket = await f.login();
  for (const send of [
    () => socket.pong(),
    () => socket.ping(),
    () => socket.send(JSON.stringify(frame('pong'))),
    () => socket.send(JSON.stringify(frame('ping'))),
  ]) {
    await vi.advanceTimersByTimeAsync(20_000);
    send();
    await tick();
  }
  expect(f.registry.current(f.credential.record.id)).toBeDefined();
  vi.useRealTimers();
  const closed = once(socket, 'close');
  socket.close();
  await closed;
  expect(f.registry.current(f.credential.record.id)).toBeUndefined();
  expect(f.cleanup).toHaveBeenCalledTimes(1);
});
it('AT-H08 bounds unsent controls at 256 and preserves FIFO', () => {
  const send = vi.fn();
  const close = vi.fn();
  const queue = new ControlQueue(send, close);
  for (let index = 0; index < 257; index++) queue.enqueue(String(index));
  expect(close).toHaveBeenCalledWith(4008);
  expect(send).toHaveBeenCalledTimes(1);
  const done = send.mock.calls[0]?.[1] as () => void;
  done();
  expect(send.mock.calls[1]?.[0]).toBe('1');
});
it('AT-H09 errors on unknown commands, ignores additive notifications and validates known bodies', async () => {
  const socket = await f.login();
  socket.send(JSON.stringify(frame('display.resync', { address: 'pi/hdmi' })));
  for (const type of ['future.event', 'future.update', 'future.state', 'future.ack'])
    socket.send(JSON.stringify(frame(type)));
  const command = frame('future.command');
  const unknown = { type: 'error', ref: command.id, body: { code: 'UNKNOWN_TYPE' } };
  expect(await request(socket, command)).toMatchObject(unknown);
  const invalidFrame = frame('display.state');
  expect(await request(socket, invalidFrame)).toMatchObject({ ref: invalidFrame.id, body: { code: 'BAD_REQUEST' } });
  const forbidden = await request(socket, frame('display.resync', { address: 'pi/other' }));
  expect(forbidden.body).toMatchObject({ code: 'FORBIDDEN' });
  expect(f.registry.current(f.credential.record.id)).toBeDefined();
});
it('AT-H10 revokes connected sessions through the command boundary', async () => {
  const socket = await f.login();
  const closed = once(socket, 'close');
  expect(await f.revoke()).toEqual({ ok: true });
  expect(await closeCode(closed)).toBe(4002);
  expect(f.registry.current(f.credential.record.id)).toBeUndefined();
});
it('serializes a delayed authentication lookup with revocation and prevents resurrection', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  f.storage.getAll.mockImplementationOnce(async () => {
    const stale = structuredClone([f.node]);
    await gate;
    return stale;
  });
  const socket = await f.connect();
  socket.send(JSON.stringify(f.hello()));
  await tick();
  const closed = once(socket, 'close');
  const revocation = f.revoke();
  release();
  await revocation;
  expect(await closeCode(closed)).toBe(4002);
  expect(f.registry.current(f.credential.record.id)).toBeUndefined();
});
it('closes oversized frames with 4009, unsupported protocols with 4001, and shutdown with 1012', async () => {
  expect(await f.reject('x'.repeat(65_537), true)).toBe(4009);
  for (const type of ['future.command', 'future.state'])
    expect(await f.reject({ ...frame(type), v: 2 }, true)).toBe(4001);
  const hello = f.hello();
  hello.body.protocol = '2.0';
  expect(await f.reject(hello)).toBe(4001);
  hello.body.protocol = '1.0';
  hello.body.manifest.limits.maxJsonBytes = 1024;
  const limited = await f.login(hello);
  expect(await request(limited, { ...frame('ping'), padding: 'x'.repeat(2048) })).toMatchObject({ type: 'pong' });
  hello.body.manifest.limits.maxJsonBytes = 1;
  await expect(f.login(hello)).rejects.toThrow('Closed 4009');
  expect(f.registry.current(f.credential.record.id)).toBeUndefined();
  const active = await f.login();
  const shutdown = once(active, 'close');
  await f.close();
  expect(await closeCode(shutdown)).toBe(1012);
});
it('validates HUB_PORT and rejects upgrades outside /ws', async () => {
  expect(parseHubPort('8080')).toBe(8080);
  for (const value of [undefined, '', '0', '65536', '3.2', '8080junk']) expect(() => parseHubPort(value)).toThrow();
  await expect(f.connect('/wrong')).rejects.toThrow();
});
