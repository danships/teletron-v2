import type { Repository } from 'supersave';
import { nodeSchema, tokenSchema, type NodeRecord, type TokenRecord } from './node-record.js';

export class NodeRepository {
  private queue: Promise<void> = Promise.resolve();
  constructor(private readonly repository: Repository<NodeRecord>) {}

  private run<T>(command: () => Promise<T>): Promise<T> {
    const result = this.queue.then(command);
    this.queue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  private async read(): Promise<NodeRecord[]> {
    const rows = await this.repository.getAll();
    return rows.map((row) => {
      const parsed = nodeSchema.safeParse(row);
      if (!parsed.success) throw new Error('Invalid stored node');
      return parsed.data;
    });
  }

  async findByHash(
    hash: string
  ): Promise<{ status: 'unauthorized' } | { status: 'found'; node: NodeRecord; token: TokenRecord }> {
    try {
      const rows = await this.read();
      const matches = rows.flatMap((node) =>
        node.tokens.filter((token) => token.token_hash === hash).map((token) => ({ node, token }))
      );
      const match = matches[0];
      if (matches.length !== 1 || !match || match.token.revoked_at !== null) return { status: 'unauthorized' };
      return { status: 'found', ...match };
    } catch {
      return { status: 'unauthorized' };
    }
  }

  create(input: NodeRecord): Promise<void> {
    return this.run(async () => {
      const node = nodeSchema.parse(input);
      if (node.id || node.tokens.length !== 1 || node.tokens[0]?.revoked_at !== null) throw new Error('Invalid node');
      const rows = await this.read();
      const hashes = new Set(node.tokens.map((token) => token.token_hash));
      if (
        rows.some(
          (row) =>
            row.name === node.name ||
            row.node_id === node.node_id ||
            row.tokens.some((token) => hashes.has(token.token_hash))
        )
      )
        throw new Error('Node conflict');
      await this.repository.create(node);
    });
  }

  revoke(nodeId: string, tokenId: string, timestamp: string): Promise<void> {
    return this.run(async () => {
      const rows = await this.read();
      const node = rows.find((row) => row.node_id === nodeId);
      const token = node?.tokens.find((entry) => entry.id === tokenId);
      if (!node || !token || token.revoked_at !== null) throw new Error('Token unavailable');
      token.revoked_at = timestamp;
      await this.repository.update(nodeSchema.parse(node));
    });
  }

  issue(nodeId: string, input: TokenRecord): Promise<void> {
    return this.run(async () => {
      const token = tokenSchema.parse(input);
      const rows = await this.read();
      const node = rows.find((row) => row.node_id === nodeId);
      if (
        !node ||
        token.revoked_at !== null ||
        node.tokens.some((entry) => entry.revoked_at === null) ||
        rows.some((row) => row.tokens.some((entry) => entry.token_hash === token.token_hash || entry.id === token.id))
      )
        throw new Error('Token conflict');
      await this.repository.update(nodeSchema.parse({ ...node, tokens: [...node.tokens, token] }));
    });
  }
}
