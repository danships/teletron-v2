import { describe, expect, it } from 'vitest';

import {
  decodeJsonMessage,
  envelopeSchema,
  errorBodySchema,
  negotiateProtocolVersion,
  type Envelope,
} from './index.js';

type IsAny<Value> = 0 extends 1 & Value ? true : false;
type ExpectFalse<Value extends false> = Value;

type EnvelopeMembersAreTyped = [
  ExpectFalse<IsAny<Envelope['v']>>,
  ExpectFalse<IsAny<Envelope['type']>>,
  ExpectFalse<IsAny<Envelope['id']>>,
  ExpectFalse<IsAny<Envelope['ref']>>,
  ExpectFalse<IsAny<Envelope['ts']>>,
  ExpectFalse<IsAny<Envelope['body']>>,
];

const validEnvelope = {
  v: 1,
  type: 'display.state',
  id: '52a4574e-9b97-4d34-9fc1-2e681e805d3d',
  ref: 'a882f44e-a3de-4713-851c-5f83e03a5652',
  ts: 1_762_516_800_123,
  body: {},
};

describe('protocol envelope', () => {
  it('accepts every required field with fully inferred member types', () => {
    const typeCheck: EnvelopeMembersAreTyped = [false, false, false, false, false, false];
    const parsed = envelopeSchema.parse(validEnvelope);

    expect(typeCheck).toHaveLength(6);
    expect(parsed).toEqual(validEnvelope);
  });

  it.each([
    ['invalid JSON', '{', 'BAD_REQUEST'],
    ['a missing required field', JSON.stringify({ ...validEnvelope, id: undefined }), 'BAD_REQUEST'],
    ['a non-object body', JSON.stringify({ ...validEnvelope, body: [] }), 'BAD_REQUEST'],
  ])('rejects %s safely', (_name, input, expectedCode) => {
    const result = decodeJsonMessage(input, 65_536);

    expect(result).toEqual({
      ok: false,
      error: {
        code: expectedCode,
        message: 'Invalid JSON message',
        retryable: false,
      },
    });
  });

  it('measures the UTF-8 byte size before parsing', () => {
    const input = JSON.stringify({ ...validEnvelope, body: { value: '€' } });
    const byteLength = new TextEncoder().encode(input).byteLength;

    expect(decodeJsonMessage(input, byteLength - 1)).toEqual({
      ok: false,
      error: {
        code: 'LIMIT_EXCEEDED',
        message: 'JSON message exceeds negotiated limit',
        retryable: false,
      },
    });
  });

  it('strips additive unknown envelope and body fields', () => {
    const input = JSON.stringify({
      ...validEnvelope,
      futureEnvelopeField: 'ignored',
      body: { futureBodyField: 'ignored' },
    });

    expect(decodeJsonMessage(input, 65_536)).toEqual({
      ok: true,
      value: { ...validEnvelope, body: {} },
    });
  });

  it('requires a positive negotiated JSON limit', () => {
    expect(decodeJsonMessage(JSON.stringify(validEnvelope), 0)).toEqual({
      ok: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid JSON limit',
        retryable: false,
      },
    });
  });

  it.each([
    ['a non-dotted message token', { type: 'Display State' }],
    ['a non-UUID message ID', { id: 'message-1' }],
    ['a fractional protocol major', { v: 1.5 }],
    ['a negative timestamp', { ts: -1 }],
  ])('rejects %s', (_name, replacement) => {
    expect(envelopeSchema.safeParse({ ...validEnvelope, ...replacement }).success).toBe(false);
  });
});

describe('protocol errors', () => {
  it('accepts Slice 1 error bodies and strips details', () => {
    expect(
      errorBodySchema.parse({
        code: 'NOT_FOUND',
        message: 'Display not found',
        retryable: false,
        details: { display: 'private-value' },
      })
    ).toEqual({
      code: 'NOT_FOUND',
      message: 'Display not found',
      retryable: false,
    });
  });
});

describe('protocol version negotiation', () => {
  it('rejects a different major version', () => {
    expect(negotiateProtocolVersion('2.0')).toEqual({
      ok: false,
      error: {
        code: 'UNSUPPORTED_VERSION',
        message: 'Unsupported protocol version',
        retryable: false,
      },
    });
  });

  it('selects the lower supported minor for major version 1', () => {
    expect(negotiateProtocolVersion('1.7')).toEqual({ ok: true, value: '1.0' });
  });

  it('rejects a malformed version', () => {
    expect(negotiateProtocolVersion('1')).toEqual({
      ok: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid protocol version',
        retryable: false,
      },
    });
  });
});
