# S1-PR6 — Authenticate and track WebSocket node sessions

- Parent spec: [Spec 001](../001-hub-and-first-display.md)
- Slice PR: 6
- Ticket type: Story

## Overview

Add the hub's `/ws` upgrade endpoint and authenticated node-session lifecycle.
It enforces the five-second hello deadline, exact token grants, presence,
heartbeat, bounded control delivery, revocation and newest-connection-wins, but
does not yet persist or replay scenes.

---

## Tech Stack

- `ws` — WebSocket server transport; Node's runtime has a client but no server.
- `@types/ws` — add as a development dependency only if the selected `ws`
  release does not provide usable types.

Install with pnpm and `--ignore-scripts`; explain why native Node APIs are
insufficient for server upgrades.

---

## Implementation Steps

### Backend

1. [ ] Write in-process WebSocket tests for AT-H01 through AT-H10 before server
       code. Use fake timers for hello/heartbeat and captured structured logs.
2. [ ] Add validated `HUB_PORT` startup configuration in
       `apps/hub/src/config/hub.ts` and compose one Node HTTP server with a `ws`
       `WebSocketServer` in `noServer` mode.
3. [ ] Add `apps/hub/src/sessions/session-authenticator.ts`. Decode the first
       frame under the 64 KiB limit, require `hello`, SHA-256 the supplied token,
       load the PR4 record, compare claimed/canonical ID and name in constant-safe
       control flow, negotiate v1 and classify exact grants.
4. [ ] Add `apps/hub/src/sessions/control-queue.ts` with FIFO control delivery,
       a hard 256-message bound and close `4008` before any queued message can be
       discarded. Keep transport buffering behind an injectable sender.
5. [ ] Add `apps/hub/src/sessions/session-registry.ts` keyed by token ID and
       session ID. On successful authentication, install the new session as
       current before closing the old one with `4010`; expose presence and a
       `closeByTokenId` method for PR5 revocation.
6. [ ] Add `apps/hub/src/sessions/heartbeat.ts`. Send protocol pings every 10
       seconds, count any frame/pong as activity and close `4004` after 25 seconds
       without activity. Support JSON `ping`/`pong` through the same liveness
       timestamp.
7. [ ] Add `apps/hub/src/sessions/message-router.ts` for authenticated messages.
       Return `UNKNOWN_TYPE` for unknown commands; ignore unknown event, update,
       state and acknowledgement suffixes; validate known messages before
       dispatch.
8. [ ] Add `apps/hub/src/sessions/websocket-server.ts` to accept upgrades only on
       `/ws`, reject pre-auth messages safely, issue `welcome`, mark presence and
       clean up timers/registry/subscription callbacks exactly once on close.
9. [ ] Replace PR5's no-session revocation callback with
       `sessionRegistry.closeByTokenId(tokenId, 4002)` after the database commit.
       Expose a cleanup callback for the source lifecycle added in PR10.
10. [ ] Wire graceful shutdown with close `1012`, run session/CLI regression
        tests and `pnpm check`.

---

## Acceptance Tests Covered

- **AT-H01:** Given no first message or a non-hello first message, when five
  seconds pass or the frame arrives, then the hub closes unauthenticated.
- **AT-H02:** Given an unknown, malformed or revoked token, or mismatched node
  ID/name, when hello arrives, then the hub returns only `UNAUTHORIZED`, closes
  with `4002` and reveals no credential detail.
- **AT-H03:** Given a valid token and manifest, when hello arrives, then the hub
  sends welcome with canonical identity, selected protocol, settings and exact
  granted/rejected addresses and marks the node present.
- **AT-H04:** Given a granted manifest entry plus an ungranted one, when the node
  connects, then only the granted display becomes usable.
- **AT-H05:** Given an active connection and a newer valid connection using the
  same token, when the latter authenticates, then it becomes current, the old
  one closes with `4010` and the takeover log contains IDs but no secret.
- **AT-H06:** Given a current session, when it closes or misses the heartbeat
  timeout, then presence and source subscriptions end immediately.
- **AT-H07:** Given regular frames or pongs inside the timeout, when heartbeat
  checks run, then the session remains present.
- **AT-H08:** Given 257 unsent control messages, when enqueued, then no control
  message is dropped and the session closes with `4008`.
- **AT-H09:** Given an unknown command after authentication, when received, then
  the hub returns `UNKNOWN_TYPE`; given an unknown event/update/state/ack, it
  ignores it without closing.
- **AT-H10:** Given a connected token that is revoked, when revocation commits,
  then its session closes with `4002` and presence ends immediately.

---

## Edge Cases & Error Handling

- **Binary frame before authentication:** Return no credential detail and close
  unauthorized.
- **Frame above limit:** Close `4009`; never parse or log its content.
- **Old session closes after takeover:** Registry removal is conditional on
  session ID so it cannot remove the new current session.
- **Heartbeat/takeover/revocation race:** A single idempotent close path clears
  timers and presence exactly once.

---

## Security Considerations

- **Authentication and authorization:** Every post-hello dispatch is scoped to
  authenticated canonical identity and exact granted addresses.
- **Input validation:** All text frames pass the negotiated byte limit and shared
  schemas before routing.
- **Sensitive data exposure:** Authentication and takeover logs include node,
  token and session IDs but never token plaintext or raw hello frames.
- **Audit logging:** Record authentication result category, presence changes,
  takeovers and revocations with stable IDs.
