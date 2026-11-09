# S1-PR12 — Show YouTube followers on the first display

- Parent spec: [Spec 001](../001-hub-and-first-display.md)
- Slice PR: 12
- Ticket type: Story

## Overview

Implement the hub-only YouTube follower adapter, complete the three-module
first-display scene and document/start-test the full Pi/Caddy workflow. This PR
finishes Slice 1 with a live clock, current weather and explicitly rounded public
subscriber count that survives hub and node restarts as specified.

---

## Implementation Steps

### Backend

1. [ ] Write AT-Y01 through AT-Y06 with injected fetch and captured logs/protocol
       state before adapter code. Include hidden count, no items, unsafe integer,
       malformed/HTTP failures and secret-redaction scans.
2. [ ] Add `YOUTUBE_API_KEY` and `YOUTUBE_CHANNEL_ID` parsing in
       `apps/hub/src/config/youtube.ts`. Require both only when an assigned scene
       references `youtube.followers`; validate a non-empty channel ID and never
       include the key value in errors.
3. [ ] Add `apps/hub/src/sources/youtube-response.ts` with a strict schema for
       `channels.list` statistics. Parse decimal subscriber text to a safe integer
       only when one visible item exists and the count is public.
4. [ ] Add `apps/hub/src/sources/youtube-followers-adapter.ts` using native fetch
       and the PR10 abort signal. Build an HTTPS `channels` request with
       `part=statistics`, configured channel ID and API key; never expose the URL
       outside the adapter.
5. [ ] Register `youtube.followers` with a 5-minute refresh interval and
       10-minute freshness. Map `{ count, rounded: true, retrievedAt }` as the
       complete JSON replacement and return fixed provider-specific safe failures.
6. [ ] Extend `examples/scenes/first-display.json` with the follower module and a
       literal label that states the provider count is rounded. Validate the
       complete clock/weather/follower fixture through the shared scene schema.

### Frontend / Node

1. [ ] Add the follower-count renderer assertion for AT-Y06 and ensure its safe
       integer uses locale formatting without changing the rounded label.
2. [ ] Write AT-E01 through AT-E04 as full-stack tests using isolated MySQL,
       in-process HTTP provider fixtures, the real hub WebSocket server, real node
       cache/loopback renderer and fake controllable time. Assert rendered DOM and
       protocol/cache behavior, not internal calls.
3. [ ] Exercise stop/restart sequences: hub stop triggers marker by heartbeat,
       node restart renders cache with no hub, and hub return replays only newer
       state before ready clears the marker.

### Tests and Documentation

1. [ ] Add `docs/operations/first-display.md` with environment-variable names,
       MySQL migration/start, node create/grant, one-time token placement, scene
       apply, hub/node commands, kiosk URL and troubleshooting. Use placeholders,
       never example secrets that look real.
2. [ ] Document a minimal Caddy route that terminates TLS and proxies `/ws` to
       the hub, plus Pi startup/kiosk guidance. Do not automate provisioning,
       certificates or service installation.
3. [ ] Run targeted source/full-stack tests and `pnpm check`. Manually smoke-test
       the documented commands against non-production credentials before marking
       Slice 1 ready for Dan's acceptance.

---

## Acceptance Tests Covered

- **AT-Y01:** Given an active subscriber, when followers fetch, then the request
  uses `channels.list`, `part=statistics`, the configured channel ID and API key
  on the hub only.
- **AT-Y02:** Given a valid public subscriber count, when mapped, then it is
  emitted as a safe integer with `rounded: true` and retrieval time.
- **AT-Y03:** Given a hidden subscriber count, empty item list, unsafe integer,
  HTTP error or malformed response, when fetched, then the shared source failure
  behavior applies with a safe provider-specific reason.
- **AT-Y04:** Given logs, protocol frames, node cache and renderer state, when
  inspected after a fetch, then the YouTube API key is absent.
- **AT-Y05:** Given the source is referenced but its API key or channel ID is
  missing, when the hub starts, then configuration fails clearly without
  printing the key.
- **AT-Y06:** Given subscriber count text on the wall, when rendered, then its
  label states that the provider count is rounded.
- **AT-E01:** Given MySQL, a paired Pi display and the example scene, when hub and
  node start, then one kiosk page shows a live clock, current weather and the
  rounded YouTube follower count.
- **AT-E02:** Given that working wall scene, when the hub stops, then within the
  heartbeat timeout the offline marker appears, values remain and the clock
  continues.
- **AT-E03:** Given the cached offline wall scene, when the node restarts while
  the hub remains unavailable, then the same scene returns without the hub and
  is marked offline.
- **AT-E04:** Given the offline wall scene, when the hub returns, then the node
  reconnects, replays only newer state and removes the marker after ready.

---

## Edge Cases & Error Handling

- **Public count unavailable:** Apply the shared unavailable/cached-value behavior
  and a safe reason; never invent zero.
- **Very large decimal count:** Reject values above JavaScript's safe integer
  range before cache/protocol/rendering.
- **Provider quota/auth error:** Classify safely without logging request URL,
  headers, response body or API key; retry on the normal refresh interval.
- **Hub returns with unchanged source values:** Resume sends only state newer than
  the node's cached revisions and still terminates with `session.ready`.

---

## Security Considerations

- **Authentication and authorization:** YouTube access occurs only inside the hub
  adapter; node/display paths receive mapped public count data only.
- **Input validation:** Configuration, provider response, scene and rendered
  state each pass their existing schemas/bounds.
- **Sensitive data exposure:** Redaction tests cover logs, errors, protocol
  frames, cache, SSE state and operational documentation.
- **Audit logging:** Record provider/source ID, safe status category and duration;
  never record API key, complete URL or raw response.
