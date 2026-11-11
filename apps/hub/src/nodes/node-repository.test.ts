import type { Repository } from 'supersave';
import { expect, it, vi } from 'vitest';
import type { NodeRecord } from './node-record.js';
import { NodeRepository } from './node-repository.js';

it('preserves a command failure and continues processing queued commands', async () => {
  const failure = new Error('Storage unavailable');
  const repository = { getAll: vi.fn().mockRejectedValueOnce(failure).mockResolvedValue([]) };
  const nodes = new NodeRepository(repository as unknown as Repository<NodeRecord>);
  const first = nodes.revoke('missing', 'missing', '2026-01-01T00:00:00.000Z');
  const second = nodes.revoke('missing', 'missing', '2026-01-01T00:00:00.000Z');
  await expect(first).rejects.toBe(failure);
  await expect(second).rejects.toThrow('Token unavailable');
  expect(repository.getAll).toHaveBeenCalledTimes(2);
});
