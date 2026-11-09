# S1-PR7 — Connect and resume a Pi display node

- Parent spec: [Spec 001](../001-hub-and-first-display.md)
- Slice PR: 7
- Ticket type: Story

## Overview

Turn `apps/node` into a headless Pi display client that validates configuration,
uses Node's native WebSocket client, reconnects safely and atomically maintains
the last accepted scene/data cache. Rendering remains outside this PR.

---

## Implementation Steps

### Frontend / Node

1. [ ] Write AT-N01 through AT-N09 as failing tests first. Use a fake in-process
       hub, fake clock/random source and temporary state directories; never place
       a real token in snapshots.
2. [ ] Add `apps/node/src/config.ts` for `HUB_URL`, `NODE_ID`, `NODE_NAME`,
       `NODE_TOKEN`, `NODE_INSTANCE` and `NODE_STATE_DIR`. Add explicit
       development mode for loopback `ws://`; require path-free `wss://` origins
       otherwise. Parse optional renderer configuration only in PR9.
3. [ ] Add `apps/node/src/manifest.ts` for one revisioned local `display:web`
       capability and current receive/viewport limits. Reuse only exported
       protocol schemas/types.
4. [ ] Add `apps/node/src/state/display-state.ts` as the in-memory reducer.
       Accept higher scene revisions, full data replacements and the generation
       announced by the current welcome; reject stale scenes/sequences and all
       superseded generations for that session.
5. [ ] Add `apps/node/src/state/cache-store.ts`. Store scene, module snapshots
       and revisions—but no node token or provider credentials—in a versioned
       JSON file under a `0700` directory. Write a `0600` temporary file, fsync,
       then atomically rename over the cache.
6. [ ] Add `apps/node/src/reconnect-policy.ts` with injectable random/time:
       1-second exponential delays, 30-second cap, 0–50% jitter and reset only
       after 60 seconds continuously ready.
7. [ ] Add `apps/node/src/hub-connection.ts` using the Node 24 global
       `WebSocket`. Append `/ws`, send hello with cache resume state, process
       welcome/scene/data/ready, send `display.state` after durable apply and
       every 60 seconds, and send `display.resync` for wrong-scene/unknown-module
       data.
8. [ ] Map close `4001`, `4002`, `4009` and `4010` to non-reconnecting safe
       statuses. Reconnect with the policy for transient closes, `4004`, `4008`
       and `1012`; do not include token or provider data in status/errors.
9. [ ] Add an injected node-status observer that PR9 can use for offline and
       ready rendering. Wire startup in `apps/node/src/index.ts` so invalid config
       fails before cache/socket work.
10. [ ] Run node tests, inspect cache modes/content, and run `pnpm check`.

---

## Acceptance Tests Covered

- **AT-N01:** Given complete valid configuration, when the node starts, then it
  connects to the configured hub and sends hello with manifest and cache resume
  revisions.
- **AT-N02:** Given missing/invalid configuration or a non-`wss://` production
  URL, when the node starts, then it fails before opening a socket and does not
  print the token.
- **AT-N03:** Given a transient close, when reconnecting, then delays start at 1
  second, double to at most 30 seconds, include bounded jitter and reset only
  after 60 seconds ready.
- **AT-N04:** Given close `4001`, `4002`, `4009` or `4010`, when handled, then the
  node stops reconnecting and exposes the corresponding safe status.
- **AT-N05:** Given a valid higher scene revision, when received, then the node
  atomically caches and applies it before acknowledging.
- **AT-N06:** Given a lower scene revision, non-increasing sequence in the
  current data generation or a superseded generation, when received, then the
  node ignores it; given the generation announced by a new welcome, then its
  first sequence is accepted without discarding cached data prematurely.
- **AT-N07:** Given data for the wrong scene or unknown module, when received,
  then the node keeps its state and sends `display.resync`.
- **AT-N08:** Given a write interruption, when the node restarts, then it loads
  the last complete cache rather than a partial file.
- **AT-N09:** Given the cache directory and files, when permissions are inspected,
  then they are owner-only and contain no node/provider secret.

---

## Edge Cases & Error Handling

- **Corrupt cache:** Quarantine/ignore it with a safe local status; never send its
  revisions in resume state.
- **Disconnect during cache write:** Finish or discard the temp write while the
  previous complete file remains loadable.
- **Ready followed immediately by close:** Do not reset backoff until the full
  60-second ready window completes.
- **Cached newer generation:** Keep it visible until current-generation data
  arrives; ordering protection is scoped to the authenticated session.

---

## Security Considerations

- **Authentication and authorization:** The token is sent only in hello over an
  allowed `wss://` connection (or explicit loopback development connection).
- **Input validation:** Configuration, protocol messages and cache contents all
  pass shared schemas.
- **Sensitive data exposure:** The token is held only in process configuration;
  it is absent from cache, renderer state, errors and logs.
- **Audit logging:** Local connection-state logs identify hub origin/node without
  query data or credentials.
