import { parseDatabaseUrl } from '../src/config/database.js';

export function parseTestDatabaseUrl(value: string | undefined): string {
  try {
    const url = new URL(parseDatabaseUrl(value));
    if (/^\/(?:test(?:[_-].*)?|.+[_-]test)$/.test(url.pathname)) return url.href;
  } catch {
    // Reject invalid URLs without exposing credentials.
  }
  throw new Error('An explicit test MySQL DATABASE_URL is required');
}
