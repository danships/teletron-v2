import { randomUUID } from 'node:crypto';
import { decodeJsonMessage, decodeSessionMessage, type ErrorCode } from '@teletron/protocol';
import type { Session } from './session-registry.js';
export const envelope = (type: string, body: unknown, reference?: string) => ({
  v: 1,
  type,
  id: randomUUID(),
  ts: Date.now(),
  body,
  ...(reference ? { ref: reference } : {}),
});
export const errorFrame = (code: ErrorCode, reference?: string) =>
  envelope('error', { code, message: code, retryable: false }, reference);
export function inputError(code: ErrorCode, input: string) {
  const decoded = decodeJsonMessage(input, 65_536);
  return errorFrame(code, decoded.ok ? decoded.value.id : undefined);
}
export function route(input: string, session: Session, send: (message: unknown) => void) {
  const decoded = decodeSessionMessage(input, 65_536);
  if (!decoded.ok) {
    send(inputError(decoded.error.code, input));
    return;
  }
  const value = decoded.value;
  if (!value.known) {
    if (value.handling === 'error') send(errorFrame('UNKNOWN_TYPE', value.envelope.id));
    return;
  }
  const message = value.message;
  if (message.v !== 1) {
    session.close(4001);
    return;
  }
  if (message.type === 'ping') send(envelope('pong', {}, message.id));
  else if (message.type === 'display.state' || message.type === 'display.resync') {
    if (!session.addresses.includes(message.body.address)) send(errorFrame('FORBIDDEN', message.id));
  } else if (message.type !== 'pong') send(errorFrame('BAD_REQUEST', message.id));
}
