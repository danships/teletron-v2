# S1-PR2 — Define node session messages

- Parent spec: [Spec 001](../001-hub-and-first-display.md)
- Slice PR: 2
- Ticket type: Story

## Overview

Add the pure schemas for node identity, capability manifests, exact token grants,
resume state and the Slice 1 connection lifecycle messages. The result lets hub
and node share one validated handshake contract without adding transport I/O.

---

## Implementation Steps

### Shared protocol package

1. [ ] Verify that the planned protected-path changes are covered by approved Spec 001; no additional approval is needed.
2. [ ] Add failing fixtures in `packages/protocol/src/identity.test.ts` for
       AT-P07 and in `packages/protocol/src/manifest.test.ts` for AT-P08,
       AT-P09 and AT-P11.
3. [ ] Add failing valid/invalid fixtures for every message in AT-P10 in
       `packages/protocol/src/session-messages.test.ts`.
4. [ ] Add `packages/protocol/src/identity.ts` with the shared lowercase
       ASCII/hyphen name schema, UUID node/session/token IDs, capability instance
       schema, and `buildCapabilityAddress(nodeName, instance)`. Enforce 1–63
       characters for each address part.
5. [ ] Add `packages/protocol/src/manifest.ts` with open manifest and capability
       parameter schemas. Require positive manifest revision, implementation
       kind, positive receive limits, unique `(type, instance)` pairs and
       `local | shared` scope. Define the Slice 1 `display:web` parameters for
       target `web` and positive viewport hints.
6. [ ] Add a strict `tokenGrantSchema` for exact `{ type, instance, scope }`
       arrays and `classifyManifestGrants(manifest, grants)`. Return only granted
       and rejected addresses; reject scope elevation and do not create a pending
       state.
7. [ ] Add `packages/protocol/src/session-messages.ts` with open schemas and
       inferred types for `hello`, `welcome`, `session.ready`, `ping` and `pong`.
       Include canonical node identity, protocol string, full manifest, resume
       scene/data revisions, session/generation UUIDs, hub time, heartbeat,
       limits and granted/rejected addresses exactly as Spec 001 defines.
8. [ ] Add a discriminated message decoder that composes the PR1 envelope with
       these known bodies while retaining PR1 unknown-type classification for
       applications.
9. [ ] Export only schemas, inferred types and pure helpers from
       `packages/protocol/src/index.ts`; do not add session state machines or
       token hashing to the package.
10. [ ] Run protocol tests and `pnpm check`.

---

## Acceptance Tests Covered

- **AT-P07:** Given valid node and instance names, when an address is built, then
  it is `<node>/<instance>`; invalid characters, empty parts and parts over 63
  characters are rejected.
- **AT-P08:** Given a valid `display:web` capability, when its manifest is
  validated, then its type, instance, local scope, limits and parameters are
  retained.
- **AT-P09:** Given duplicate capability `(type, instance)` pairs or an invalid
  manifest revision, when validated, then the manifest is rejected.
- **AT-P10:** Given each Slice 1 session message, when a valid and invalid
  fixture is decoded, then only the valid fixture produces the typed body.
- **AT-P11:** Given a manifest capability or scope not present in the token
  grants, when grants are classified, then it is rejected and never treated as
  pending or granted.

---

## Edge Cases & Error Handling

- **Duplicate capabilities or grants:** Reject the whole collection rather than
  choosing one entry.
- **Identity mismatch:** Schemas validate shape only; the hub compares claimed
  and canonical identity in PR6.
- **Unknown capability type:** Preserve its open parameters but classify it as
  rejected unless an exact token grant exists.
- **Resume without cache:** Represent absent scene/data revisions explicitly;
  do not manufacture revision zero.

---

## Security Considerations

- **Authentication and authorization:** This PR defines claims and exact grants;
  it does not authenticate. Grant classification always fails closed.
- **Input validation:** Names, IDs, limits, manifest uniqueness and all message
  bodies use shared schemas.
- **Sensitive data exposure:** The hello schema accepts the token for transport,
  but no helper logs or serializes it outside the message.
- **Audit logging:** None in this pure package.
