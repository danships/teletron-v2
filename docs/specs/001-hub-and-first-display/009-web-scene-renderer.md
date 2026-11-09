# S1-PR9 — Render cached web scenes and a local clock

- Parent spec: [Spec 001](../001-hub-and-first-display.md)
- Slice PR: 9
- Ticket type: Story

## Overview

Add the Pi node's loopback HTTP/SSE boundary and fixed DOM renderer. A kiosk page
renders complete cached state, continues local clocks and shows connectivity
without exposing node credentials or accepting arbitrary markup.

---

## Tech Stack

- `happy-dom` — development-only DOM environment for Vitest renderer tests; add
  it to `apps/node` with pnpm and `--ignore-scripts`.

---

## Implementation Steps

### Frontend / Node

1. [ ] Write AT-R01, AT-R02 and AT-R09 as failing loopback HTTP/SSE integration
       tests and AT-R03 through AT-R08 as failing happy-dom renderer tests before
       implementation.
2. [ ] Extend node config with optional `NODE_RENDERER_PORT` defaulting to 8081.
       Validate the port, but do not expose a host setting.
3. [ ] Add `apps/node/src/renderer/render-state.ts` to derive a credential-free
       complete view from PR7 display/cache status. The state includes scene,
       data snapshots, offline/ready status and one monotonically increasing local
       event revision.
4. [ ] Add `apps/node/src/renderer/renderer-server.ts` using Node HTTP and binding
       literal `127.0.0.1`. Serve only a fixed HTML shell, fixed local CSS/JS
       assets and `/events`; reject other routes/methods and set no-store and
       restrictive content-security headers.
5. [ ] Implement SSE so every new connection receives one named complete-state
       event before queued incremental state events. Remove disconnected clients
       and cap each client queue; replace a slow client with a fresh complete
       state rather than growing memory.
6. [ ] Add `apps/node/src/renderer/components.ts` with an exhaustive renderer for
       `stack`, `text`, `big-number` and `icon`. Create elements with DOM APIs,
       map style tokens to renderer-owned class names, set values with
       `textContent` and never use `innerHTML`, inline style or remote assets.
7. [ ] Add `apps/node/src/renderer/scene-renderer.ts` to build the declared CSS
       grid, resolve literal/data/local-clock values and render placeholders for
       missing data without removing module layout.
8. [ ] Add a single minute/second-aligned local clock scheduler based on formats
       present in the current scene. Update clock text locally without modifying
       cached hub data.
9. [ ] Connect PR7 status/state observation: mark offline after disconnect,
       preserve full scene/data with no dimming, and clear the marker only on
       `session.ready`. On startup, publish a valid cache before connecting.
10. [ ] Wire renderer-server lifecycle into `apps/node/src/index.ts`, run DOM and
        HTTP/SSE tests, then `pnpm check`.

---

## Acceptance Tests Covered

- **AT-R01:** Given a renderer request from a non-loopback interface, when the
  service is configured, then it is not listening there.
- **AT-R02:** Given a browser opens after state already exists, when its SSE
  stream starts, then complete current state arrives before later updates.
- **AT-R03:** Given the three-module example scene, when rendered, then the clock,
  weather and rounded follower count occupy their declared grid cells.
- **AT-R04:** Given each allowed component and style token, when rendered, then
  it produces only renderer-owned DOM classes and text/icon content.
- **AT-R05:** Given a missing initial data value, when rendered, then the module
  shows a clear unavailable/loading placeholder without breaking layout.
- **AT-R06:** Given a hub disconnect after a scene was cached, when the renderer
  updates, then it adds an offline marker, keeps scene/data unchanged and does
  not dim them.
- **AT-R07:** Given the hub remains offline, when minutes change, then the local
  clock continues to update without hub data.
- **AT-R08:** Given the hub reconnects, when state replay completes, then the
  offline marker clears only after `session.ready`.
- **AT-R09:** Given no hub at node startup but a valid cache, when the kiosk page
  opens, then it renders that cache and the offline marker.

---

## Edge Cases & Error Handling

- **Malformed SSE event:** Browser keeps the last complete state and waits for a
  later complete event; it never clears the page.
- **Browser reconnect:** New SSE connection always starts from complete current
  state; no replay log is required.
- **Unknown icon token at runtime:** This should be schema-impossible; render the
  neutral weather fallback if corrupted state crosses the boundary.
- **Clock drift/system-time change:** Recompute on every aligned tick rather than
  incrementing displayed time.

---

## Security Considerations

- **Authentication and authorization:** The renderer is loopback-only and has no
  mutation endpoints.
- **Input validation:** Only already validated render state crosses SSE; the
  browser validates the complete-state discriminator before applying it.
- **Sensitive data exposure:** Renderer state and static assets exclude node
  token, hub hello, provider credentials and filesystem paths.
- **Audit logging:** Log listener startup and client counts only; do not log
  scene data by default.
