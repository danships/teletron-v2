import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createConnection as connectSocket } from 'node:net';
import path from 'node:path';
import { createConnection } from 'mysql2/promise';
import { SuperSave } from 'supersave';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createDatabase } from '../src/db/database.js';
import { nodeEntity } from '../src/db/schema/node.js';
import { startControlServer } from '../src/control/control-server.js';
import { sendControlCommand } from '../src/control/control-client.js';
import { parseTestDatabaseUrl } from './test-database-url.js';

const base = parseTestDatabaseUrl(process.env['DATABASE_URL']);
const name = `teletron_test_${randomUUID().replaceAll('-', '')}`;
const url = new URL(base);
url.pathname = `/${name}`;
const grants = [{ type: 'display:web', instance: 'hdmi', scope: 'local' }] as const;
let database: Awaited<ReturnType<typeof createDatabase>>;
let raw: SuperSave;
let rows: Awaited<ReturnType<SuperSave['addEntity']>>;
let directory: string;
let socket: string;
let server: Awaited<ReturnType<typeof startControlServer>>;
const closed: string[] = [];

beforeAll(async () => {
  const connection = await createConnection(base);
  await connection.query(`CREATE DATABASE \`${name}\``);
  await connection.end();
  database = await createDatabase(url.href);
  raw = await SuperSave.create(url.href);
  rows = await raw.addEntity(nodeEntity);
  directory = await mkdtemp(path.join(tmpdir(), 'teletron-control-'));
  socket = path.join(directory, 'hub.sock');
  server = await startControlServer(socket, database.nodes, async (id) => {
    closed.push(id);
  });
});
afterAll(async () => {
  await server?.close();
  await database?.close();
  await raw?.close();
  await rm(directory, { recursive: true, force: true });
  const connection = await createConnection(base);
  await connection.query(`DROP DATABASE \`${name}\``);
  await connection.end();
});

describe('control acceptance', () => {
  it('AT-C01–C06: creates, stores hashes, rejects conflicts, revokes and replaces credentials', async () => {
    const log = vi.spyOn(console, 'log');
    const error = vi.spyOn(console, 'error');
    const created = await sendControlCommand(socket, { type: 'node.create', name: 'wall', grants: [...grants] });
    expect(created.ok).toBe(true);
    if (!created.ok || !('token' in created)) throw new Error('create failed');
    expect(Buffer.from(created.token, 'base64url')).toHaveLength(32);
    expect(JSON.stringify(created).split(created.token)).toHaveLength(2);
    const stored = await rows.getAll();
    expect(JSON.stringify(stored)).not.toContain(created.token);
    expect(JSON.stringify(stored)).toContain(createHash('sha256').update(created.token).digest('hex'));
    const before = JSON.stringify(stored);
    for (const command of [
      { type: 'node.create', name: 'wall', grants: [...grants] },
      { type: 'node.create', name: 'INVALID NAME', grants: [...grants] },
      { type: 'node.create', name: 'other', grants: [...grants, ...grants] },
    ])
      expect(await sendControlCommand(socket, command)).toMatchObject({ ok: false });
    expect(JSON.stringify(await rows.getAll())).toBe(before);
    const saved = stored[0] as { tokens: { id: string }[] };
    const tokenId = saved.tokens[0]!.id;
    const revoked = await sendControlCommand(socket, { type: 'node.revoke', nodeId: created.nodeId, tokenId });
    expect(revoked.ok).toBe(true);
    expect(JSON.stringify(revoked)).not.toContain(created.token);
    expect(closed).toEqual([tokenId]);
    const after = await rows.getAll();
    expect((after[0] as { tokens: { revoked_at: string | null }[] }).tokens[0]?.revoked_at).toEqual(expect.any(String));
    for (const id of [tokenId, randomUUID()])
      expect(
        await sendControlCommand(socket, { type: 'node.revoke', nodeId: created.nodeId, tokenId: id })
      ).toMatchObject({ ok: false });
    expect(await rows.getAll()).toEqual(after);
    const replacement = await sendControlCommand(socket, {
      type: 'node.issue-token',
      nodeId: created.nodeId,
      grants: [...grants],
    });
    expect(replacement).toMatchObject({ ok: true, nodeId: created.nodeId, name: 'wall' });
    if (!replacement.ok || !('token' in replacement)) throw new Error('issue failed');
    expect(JSON.stringify(replacement).split(replacement.token)).toHaveLength(2);
    expect(JSON.stringify(await rows.getAll())).not.toContain(replacement.token);
    expect(JSON.stringify([log.mock.calls, error.mock.calls])).not.toContain(created.token);
    expect(JSON.stringify([log.mock.calls, error.mock.calls])).not.toContain(replacement.token);
    log.mockRestore();
    error.mockRestore();
  });
  it('prints CLI credentials once and keeps diagnostics on stderr', async () => {
    const run = promisify(execFile);
    const result = await run(
      process.execPath,
      ['apps/hub/dist/node-cli.js', 'create', 'cli-wall', JSON.stringify(grants)],
      {
        env: { ...process.env, HUB_CONTROL_SOCKET: socket },
      }
    );
    const token = /Token: ([A-Za-z0-9_-]+)/.exec(result.stdout)?.[1];
    expect(token).toBeDefined();
    expect(result.stdout).toContain('Name: cli-wall');
    expect(result.stdout.split(token!)).toHaveLength(2);
    expect(result.stderr).not.toContain(token);
    expect(JSON.stringify(await rows.getAll())).not.toContain(token);
  });
  it('AT-C07: uses an owner-only Unix socket and rejects malformed commands', async () => {
    const entry = await stat(socket);
    expect(entry.isSocket()).toBe(true);
    expect(entry.uid).toBe(process.getuid?.());
    expect(entry.mode & 0o777).toBe(0o600);
    const before = await rows.getAll();
    expect(await sendControlCommand(socket, { type: 'unknown' })).toMatchObject({ ok: false });
    const response = await new Promise<string>((resolve, reject) => {
      const connection = connectSocket(socket);
      let data = '';
      connection.on('connect', () => connection.end('{"type":"unknown"}\n{"type":"unknown"}\n'));
      connection.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });
      connection.on('end', () => resolve(data));
      connection.on('error', reject);
    });
    expect(JSON.parse(response)).toMatchObject({ ok: false });
    expect(await rows.getAll()).toEqual(before);
  });
});
