import { once } from 'node:events';
import { parseHubPort } from './config/hub.js';
import { createSessionServer } from './sessions/websocket-server.js';
import { createDatabase } from './db/database.js';
import { parseControlSocket } from './config/control.js';
import { startControlServer } from './control/control-server.js';

async function main() {
  const port = parseHubPort(process.env['HUB_PORT']);
  const path = await parseControlSocket(process.env['HUB_CONTROL_SOCKET']);
  const database = await createDatabase(process.env['DATABASE_URL']);
  const sessions = createSessionServer(database.nodes);
  try {
    const listening = once(sessions.http, 'listening');
    sessions.http.listen(port);
    await listening;
    const control = await startControlServer(path, database.nodes, async (id) =>
      sessions.registry.closeByTokenId(id, 4002)
    );
    let stopping = false;
    const shutdown = () => {
      if (stopping) return;
      stopping = true;
      void Promise.all([control.close(), sessions.close()]).then(() => database.close());
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  } catch {
    await sessions.close();
    await database.close();
    throw new Error('Hub startup failed');
  }
}
await main().catch(() => {
  console.error('Hub startup failed');
  process.exitCode = 1;
});
export { createDatabase } from './db/database.js';
