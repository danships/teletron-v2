import { startNode } from './hub-connection.js';

await startNode(process.env).catch(() => {
  console.error('Teletron node startup failed. Check the node configuration.');
  process.exitCode = 1;
});
