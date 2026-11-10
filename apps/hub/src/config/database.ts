export function parseDatabaseUrl(value: string | undefined): string {
  try {
    if (!value) throw new Error('Invalid DATABASE_URL');
    const url = new URL(value);
    if (url.protocol !== 'mysql:' || !url.hostname || url.pathname.length < 2) throw new Error('Invalid DATABASE_URL');
    return value;
  } catch {
    throw new Error('Invalid DATABASE_URL');
  }
}
