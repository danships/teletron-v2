import { randomUUID } from 'node:crypto';
import { chmod, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { displaySceneSetBodySchema as sceneSet, nodeIdSchema, type DisplaySceneSetBody } from '@teletron/protocol';
import { z } from 'zod';

export const cacheSchema = z.strictObject({ version: z.literal(1), nodeId: nodeIdSchema, state: sceneSet });

export function cacheStore(directory: string, nodeId: string) {
  const file = path.join(directory, 'display-cache.json');

  async function load(address: string) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await chmod(directory, 0o700);
    try {
      await chmod(file, 0o600);
      const cached = cacheSchema.parse(JSON.parse(await readFile(file, 'utf8')));
      return cached.nodeId === nodeId && cached.state.address === address ? cached.state : undefined;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
      throw error;
    }
  }

  async function save(state: DisplaySceneSetBody) {
    const temporary = `${file}.${randomUUID()}.tmp`;
    const content = JSON.stringify({ version: 1, nodeId, state });
    try {
      await writeFile(temporary, content, { flag: 'wx', mode: 0o600, flush: true });
      await rename(temporary, file);
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      throw error;
    }
  }

  return { load, save };
}
