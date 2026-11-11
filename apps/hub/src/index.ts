import { PROTOCOL_VERSION } from '@teletron/protocol';

// Hub entry point. Roadmap slice 1 adds the WebSocket server, supersave on MySQL and the first scenes.
console.log(`Teletron hub, protocol v${PROTOCOL_VERSION}`);

export { createDatabase } from './db/database.js';
