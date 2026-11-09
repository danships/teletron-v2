import { describe, expect, it } from 'vitest';

import { BINARY_HEADER_SIZE, decodeBinaryHeader, encodeBinaryHeader } from './index.js';

const audioHeader = {
  kind: 'audio' as const,
  final: true,
  streamId: 0x01_02_03_04,
  seq: 0x05_06_07_08,
  ts: 151_653_132,
};

const blobHeader = {
  kind: 'blob' as const,
  final: false,
  streamId: 4_294_967_295,
  seq: 0,
  ts: 0x10_20_30_40,
};

describe('binary header codec', () => {
  it.each([
    ['audio', audioHeader, [0x54, 1, 1, 1, 4, 3, 2, 1, 8, 7, 6, 5, 12, 11, 10, 9]],
    ['blob', blobHeader, [0x54, 1, 2, 0, 255, 255, 255, 255, 0, 0, 0, 0, 64, 48, 32, 16]],
  ] as const)('round-trips the %s fixture in little-endian order', (_name, header, bytes) => {
    const encoded = encodeBinaryHeader(header);

    expect([...encoded]).toEqual(bytes);
    expect(decodeBinaryHeader(encoded)).toEqual({ ok: true, value: header });
  });

  it.each([
    ['bad magic', 0, 0],
    ['unsupported version', 1, 2],
    ['unknown kind including the removed pixel kind', 2, 3],
  ])('rejects %s', (_name, offset, value) => {
    const encoded = encodeBinaryHeader(audioHeader);
    encoded[offset] = value;

    expect(decodeBinaryHeader(encoded).ok).toBe(false);
  });

  it('rejects a buffer shorter than 16 bytes', () => {
    expect(decodeBinaryHeader(new Uint8Array(BINARY_HEADER_SIZE - 1))).toEqual({
      ok: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid binary header',
        retryable: false,
      },
    });
  });

  it('ignores unknown flag bits while preserving the final bit', () => {
    const encoded = encodeBinaryHeader(audioHeader);
    encoded[3] = 255;

    expect(decodeBinaryHeader(encoded)).toEqual({ ok: true, value: audioHeader });
  });

  it('rejects values outside the unsigned 32-bit range', () => {
    expect(() => encodeBinaryHeader({ ...audioHeader, seq: 0x1_00_00_00_00 })).toThrow(RangeError);
  });
});
