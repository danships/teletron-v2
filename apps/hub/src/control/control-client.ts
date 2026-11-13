import { createConnection } from 'node:net';
import { MAX_BYTES, responseSchema, type Response } from './control-messages.js';

export async function sendControlCommand(path: string, command: unknown): Promise<Response> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(path);
    let input = '';
    socket.on('connect', () => socket.end(`${JSON.stringify(command)}\n`));
    socket.on('data', (data: Buffer) => {
      input += data.toString('utf8');
      if (Buffer.byteLength(input) > MAX_BYTES) socket.destroy(new Error('Response too large'));
    });
    socket.on('error', () => reject(new Error('Control connection failed')));
    socket.on('end', () => {
      try {
        if (!input.endsWith('\n') || input.indexOf('\n') !== input.length - 1) throw new Error('Invalid frame');
        resolve(responseSchema.parse(JSON.parse(input)));
      } catch {
        reject(new Error('Invalid control response'));
      }
    });
  });
}
