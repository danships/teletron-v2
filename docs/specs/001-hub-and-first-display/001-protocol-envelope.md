# S1-PR1 — Define the v1 envelope and binary header

- Parent spec: [Spec 001](../001-hub-and-first-display.md)
- Slice PR: 1
- Ticket type: Story

## Overview

Define the transport-neutral v1 message envelope, error result, version
negotiation, JSON size enforcement and 16-byte binary header in
`@teletron/protocol`. This PR contains schemas and pure codecs only: it adds no
WebSocket, filesystem or application I/O.

---

## Tech Stack

- `zod` — one source for runtime validation and inferred strict TypeScript
  types; add it to `packages/protocol/package.json` with
  `pnpm --filter @teletron/protocol add zod --ignore-scripts`.

---

## Implementation Steps

### Shared protocol package

1. [ ] Verify that the planned protected-path changes are covered by approved Spec 001; no additional approval is needed.
2. [ ] Write `packages/protocol/src/envelope.test.ts` for AT-P01 through AT-P04
       before implementation, including compile-time type assertions that fail
       if an inferred envelope member becomes `any`.
3. [ ] Write `packages/protocol/src/binary-header.test.ts` for AT-P05 and
       AT-P06, including exact byte fixtures for audio and blob frames.
4. [ ] Add `packages/protocol/src/errors.ts` with the Slice 1 error-code schema,
       error-body schema and typed parse-failure result. Error bodies contain
       `code`, safe `message` and `retryable`; `details` is not introduced.
5. [ ] Add `packages/protocol/src/envelope.ts` with open Zod schemas for `v`,
       dotted `type`, UUID `id`, optional UUID `ref`, non-negative integer `ts`
       and object `body`. Infer and export types from schemas; do not duplicate
       them by hand.
6. [ ] Add `decode-json-message(input, maxJsonBytes)` in `envelope.ts`. Measure
       UTF-8 bytes before `JSON.parse`, return `LIMIT_EXCEEDED` above the positive
       negotiated limit, return `BAD_REQUEST` for invalid JSON/schema, and strip
       unknown envelope/body fields.
7. [ ] Add `packages/protocol/src/version.ts` with constants for protocol
       `1.0`, parsing for `major.minor`, and negotiation that rejects a different
       major while selecting the lower supported minor for major 1.
8. [ ] Add `packages/protocol/src/binary-header.ts` with audio kind `1`, blob
       kind `2`, final flag bit 0 and pure `Uint8Array`/`DataView` encode/decode
       functions. Reject bad magic, non-v1 headers, unknown kinds and buffers
       shorter than 16 bytes; ignore unknown flag bits on decode.
9. [ ] Replace the placeholder protocol version export in
       `packages/protocol/src/index.ts` with explicit public exports. Remove the
       version-0 placeholder test only after the new acceptance tests exist.
10. [ ] Run the protocol tests, then `pnpm check`, and confirm dependency-cruiser
        sees no Node built-ins or I/O under `packages/protocol`.

---

## Acceptance Tests Covered

- **AT-P01:** Given every required envelope field, when it is validated, then it
  is accepted and its inferred type contains no `any`.
- **AT-P02:** Given invalid JSON, a missing required field, a non-object body or
  a frame over the negotiated limit, when it is decoded, then it is rejected
  with the appropriate `BAD_REQUEST` or `LIMIT_EXCEEDED` result.
- **AT-P03:** Given unknown fields in a valid envelope and body, when it is
  decoded, then the known fields are accepted and the unknown fields do not
  alter behavior.
- **AT-P04:** Given a different protocol major, when negotiation runs, then it
  fails with `UNSUPPORTED_VERSION`; given a higher minor on the same major, then
  the compatible supported minor is selected.
- **AT-P05:** Given audio or blob header values, when they are encoded and
  decoded, then every field round-trips in little-endian order.
- **AT-P06:** Given a binary header with bad magic, unsupported version, unknown
  kind or insufficient bytes, when decoded, then it is rejected; no pixel kind
  is accepted.

---

## Edge Cases & Error Handling

- **Unsafe or absent reply ID:** Parsing returns an error without inventing a
  `ref`; applications decide whether replying is safe.
- **Oversized malformed JSON:** Size rejection happens before parsing.
- **Sequence and timestamp wrap:** Binary `streamId`, `seq` and sender
  milliseconds are unsigned 32-bit values and round-trip without ordering logic.
- **Forward-compatible flags:** Encoders emit only bit 0; decoders preserve or
  ignore higher bits without treating them as supported behavior.

---

## Security Considerations

- **Input validation:** All externally supplied values are bounded and parsed
  through exported schemas/codecs.
- **Sensitive data exposure:** Parse errors are fixed safe messages and never
  echo raw frames.
- **Audit logging:** None in this pure package; applications own logging.
