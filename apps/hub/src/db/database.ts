import { SuperSave } from 'supersave';
import { parseDatabaseUrl } from '../config/database.js';
import { NodeRepository } from '../nodes/node-repository.js';
import type { NodeRecord } from '../nodes/node-record.js';
import { nodeEntity } from './schema/node.js';

export async function createDatabase(value: string | undefined) {
  const url = parseDatabaseUrl(value);
  let database: SuperSave;
  try {
    database = await SuperSave.create(url);
  } catch {
    throw new Error('Database initialization failed');
  }
  try {
    const repository = await database.addEntity<NodeRecord>(nodeEntity);
    return { nodes: new NodeRepository(repository), close: () => database.close() };
  } catch {
    await database.close();
    throw new Error('Database initialization failed');
  }
}
