import { z } from 'zod';

import { parseFailure, type ParseResult } from './errors.js';
import { PROTOCOL_MAJOR } from './version.js';

export const BINARY_HEADER_SIZE = 16;
export const BINARY_MAGIC = 0x54;

const FINAL_FLAG = 1;
const MAX_UNSIGNED_32 = 4_294_967_295;
const binaryKindSchema = z.enum(['audio', 'blob']);
const unsigned32Schema = z.number().int().min(0).max(MAX_UNSIGNED_32);

export const binaryHeaderSchema = z.object({
  kind: binaryKindSchema,
  final: z.boolean(),
  streamId: unsigned32Schema,
  seq: unsigned32Schema,
  ts: unsigned32Schema,
});

export type BinaryHeader = z.infer<typeof binaryHeaderSchema>;

const kindCodes = {
  audio: 1,
  blob: 2,
} as const;

export function encodeBinaryHeader(header: BinaryHeader): Uint8Array {
  const parsed = binaryHeaderSchema.safeParse(header);
  if (!parsed.success) {
    throw new RangeError('Binary header values are out of range');
  }

  const output = new Uint8Array(BINARY_HEADER_SIZE);
  const view = new DataView(output.buffer);
  output[0] = BINARY_MAGIC;
  output[1] = PROTOCOL_MAJOR;
  output[2] = kindCodes[parsed.data.kind];
  output[3] = parsed.data.final ? FINAL_FLAG : 0;
  view.setUint32(4, parsed.data.streamId, true);
  view.setUint32(8, parsed.data.seq, true);
  view.setUint32(12, parsed.data.ts, true);
  return output;
}

export function decodeBinaryHeader(input: Uint8Array): ParseResult<BinaryHeader> {
  if (input.byteLength < BINARY_HEADER_SIZE || input[0] !== BINARY_MAGIC) {
    return parseFailure('BAD_REQUEST', 'Invalid binary header');
  }

  if (input[1] !== PROTOCOL_MAJOR) {
    return parseFailure('UNSUPPORTED_VERSION', 'Unsupported binary header version');
  }

  const kind = decodeKind(input[2]);
  if (kind === undefined) {
    return parseFailure('BAD_REQUEST', 'Invalid binary header');
  }

  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  return {
    ok: true,
    value: {
      kind,
      final: ((input[3] ?? 0) & FINAL_FLAG) === FINAL_FLAG,
      streamId: view.getUint32(4, true),
      seq: view.getUint32(8, true),
      ts: view.getUint32(12, true),
    },
  };
}

function decodeKind(value: number | undefined): BinaryHeader['kind'] | undefined {
  if (value === kindCodes.audio) {
    return 'audio';
  }
  if (value === kindCodes.blob) {
    return 'blob';
  }
  return undefined;
}
