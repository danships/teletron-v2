import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { TokenGrants } from '@teletron/protocol';

export function createCredential(grants: TokenGrants) {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    record: {
      id: randomUUID(),
      token_hash: createHash('sha256').update(token).digest('hex'),
      grants,
      created_at: new Date().toISOString(),
      revoked_at: null,
    },
  };
}
