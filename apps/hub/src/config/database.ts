export function parseDatabaseUrl(value: string | undefined): string {
  try {
    const url = new URL(value ?? '');
    if (url.protocol === 'mysql:' && url.hostname && url.pathname.length > 1) return url.href;
  } catch {
    // Report invalid configuration without exposing credentials.
  }
  throw new Error('Invalid DATABASE_URL');
}
