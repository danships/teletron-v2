import { lstat } from 'node:fs/promises';
import path from 'node:path';

export async function parseControlSocket(value: string | undefined): Promise<string> {
  if (!value || !path.isAbsolute(value)) throw new Error('HUB_CONTROL_SOCKET must be an absolute path');
  const directory = await lstat(path.dirname(value));
  if (!directory.isDirectory() || directory.uid !== process.getuid?.() || (directory.mode & 0o077) !== 0)
    throw new Error('Control socket directory must be owned by the hub user and owner-only');
  return value;
}
