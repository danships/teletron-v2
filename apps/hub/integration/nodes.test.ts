import { parseTestDatabaseUrl } from './test-database-url.js';
import { randomUUID } from 'node:crypto';
import { createConnection } from 'mysql2/promise';
import { SuperSave } from 'supersave';
import { nodeEntity } from '../src/db/schema/node.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase } from '../src/db/database.js';

const base = parseTestDatabaseUrl(process.env['DATABASE_URL']);
const databaseName = `teletron_test_${randomUUID().replaceAll('-', '')}`;
const url = new URL(base);
url.pathname = `/${databaseName}`;
const grants = [{ type: 'display:web', instance: 'hdmi', scope: 'local' }] as const;
const token = (hash: string) => ({
  id: randomUUID(),
  token_hash: hash.repeat(64),
  grants: [...grants],
  created_at: '2026-01-01T00:00:00.000Z',
  revoked_at: null,
});
const node = (name: string, hash: string) => ({
  node_id: randomUUID(),
  name,
  created_at: '2026-01-01T00:00:00.000Z',
  tokens: [token(hash)],
});
let database: Awaited<ReturnType<typeof createDatabase>>;
let injected: SuperSave;
let rawNodes: Awaited<ReturnType<SuperSave['addEntity']>>;

beforeAll(async () => {
  const connection = await createConnection(base);
  await connection.query(`CREATE DATABASE \`${databaseName}\``);
  await connection.end();
  database = await createDatabase(url.href);
  injected = await SuperSave.create(url.href);
  rawNodes = await injected.addEntity(nodeEntity);
});
afterAll(async () => {
  await database?.close();
  await injected?.close();
  const connection = await createConnection(base);
  await connection.query(`DROP DATABASE \`${databaseName}\``);
  await connection.end();
});

describe('node persistence acceptance', () => {
  it('AT-D01: preserves the full node and token after reconnect', async () => {
    const input = node('display-one', 'a');
    await database.nodes.create(input);
    await database.close();
    database = await createDatabase(url.href);
    expect(await database.nodes.findByHash(input.tokens[0]!.token_hash)).toMatchObject({
      status: 'found',
      node: input,
    });
  });
  it('AT-D02: serializes independent duplicate name and hash requests', async () => {
    const outcomes = await Promise.allSettled([
      database.nodes.create(node('duplicate', 'b')),
      database.nodes.create(node('duplicate', 'c')),
    ]);
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const hashes = await Promise.allSettled([
      database.nodes.create(node('hash-one', 'd')),
      database.nodes.create(node('hash-two', 'd')),
    ]);
    expect(hashes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rows = await rawNodes.getAll();
    expect(rows.filter((row) => row.name === 'duplicate')).toHaveLength(1);
    expect(rows.filter((row) => row.name === 'hash-one' || row.name === 'hash-two')).toHaveLength(1);
  });
  it('AT-D03: fails closed for revoked, malformed and ambiguous records', async () => {
    const input = node('closed', 'e');
    await database.nodes.create(input);
    await database.nodes.revoke(input.node_id, input.tokens[0]!.id, '2026-02-01T00:00:00.000Z');
    expect(await database.nodes.findByHash(input.tokens[0]!.token_hash)).toEqual({ status: 'unauthorized' });
    const bad = node('bad', 'f');
    const badRow = await rawNodes.create({ ...bad, tokens: [{ ...bad.tokens[0]!, grants: [{ invalid: true }] }] });
    expect(await database.nodes.findByHash('f'.repeat(64))).toEqual({ status: 'unauthorized' });
    await rawNodes.deleteUsingId(badRow.id!);
    const duplicate = node('ambiguous', 'a');
    const duplicateRow = await rawNodes.create(duplicate);
    expect(await database.nodes.findByHash('a'.repeat(64))).toEqual({ status: 'unauthorized' });
    await rawNodes.deleteUsingId(duplicateRow.id!);
  });
  it('AT-D04: preserves history and recovers the queue after rejected commands', async () => {
    const input = node('rotation', '1');
    await database.nodes.create(input);
    const before = await rawNodes.getAll();
    await expect(database.nodes.issue(input.node_id, token('2'))).rejects.toThrow();
    expect(await rawNodes.getAll()).toEqual(before);
    await database.nodes.revoke(input.node_id, input.tokens[0]!.id, '2026-02-01T00:00:00.000Z');
    const outcomes = await Promise.allSettled([
      database.nodes.issue(input.node_id, token('3')),
      database.nodes.issue(input.node_id, token('4')),
    ]);
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rows = await rawNodes.getAll();
    const saved = rows.find((row) => row.node_id === input.node_id);
    expect(saved?.tokens).toHaveLength(2);
    expect(saved?.tokens[0]).toMatchObject({ ...input.tokens[0], revoked_at: '2026-02-01T00:00:00.000Z' });
  });
});
