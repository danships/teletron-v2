import { createDatabase } from './db/database.js';
import { parseControlSocket } from './config/control.js';
import { startControlServer } from './control/control-server.js';

async function main() {
  const path = await parseControlSocket(process.env['HUB_CONTROL_SOCKET']);
  const database = await createDatabase(process.env['DATABASE_URL']);
  try {
    const control = await startControlServer(path, database.nodes, async () => undefined);
    const shutdown = () => {
      void control.close().then(() => database.close());
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  } catch {
    await database.close();
    throw new Error('Hub startup failed');
  }
}
await main().catch(() => {
  console.error('Hub startup failed');
  process.exitCode = 1;
});
export { createDatabase } from './db/database.js';
