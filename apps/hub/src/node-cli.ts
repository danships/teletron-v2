import { parseControlSocket } from './config/control.js';
import { sendControlCommand } from './control/control-client.js';
import { commandSchema } from './control/control-messages.js';

async function main() {
  const [action, id, argument, extra] = process.argv.slice(2);
  if (!action || !id || !argument || extra)
    throw new Error('Usage: create NAME GRANTS_JSON | revoke NODE_ID TOKEN_ID | issue-token NODE_ID GRANTS_JSON');
  let command: unknown;
  if (action === 'revoke') command = { type: 'node.revoke', nodeId: id, tokenId: argument };
  if (action === 'create') command = { type: 'node.create', name: id, grants: JSON.parse(argument) };
  if (action === 'issue-token') command = { type: 'node.issue-token', nodeId: id, grants: JSON.parse(argument) };
  const result = await sendControlCommand(
    await parseControlSocket(process.env['HUB_CONTROL_SOCKET']),
    commandSchema.parse(command)
  );
  if (!result.ok) throw new Error(result.error);
  if ('token' in result) console.log(`Node ID: ${result.nodeId}\nName: ${result.name}\nToken: ${result.token}`);
}
await main().catch(() => {
  console.error('Node command failed');
  process.exitCode = 1;
});
