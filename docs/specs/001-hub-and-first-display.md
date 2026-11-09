# Spec 001: Hub and first display

- Status: Proposed
- Roadmap slice: 1 (see ADR-043)
- Related ADRs: ADR-002 through ADR-014, ADR-020 through ADR-023, ADR-034,
  ADR-040, ADR-041, ADR-043, ADR-051 and proposed ADR-056

## Goal

Run the Teletron hub and one Raspberry Pi web display node so the wall shows a
clock, current weather and the public YouTube follower count in one assigned
scene. The display keeps that scene and its last data through a hub outage,
continues the clock locally and makes the outage visible without blanking or
dimming the other modules.

## Plan

- **Files and packages touched:** `packages/protocol` for protocol, manifest,
  module and scene schemas; `apps/hub` for configuration, supersave entities,
  pairing and scene CLIs, WebSocket sessions and built-in pull sources;
  `apps/node` for the Pi client, disk cache, loopback renderer service and web
  renderer; root package manifests, environment example and operational docs.
- **New concepts:** a versioned message envelope; a capability manifest and
  grant; a logical node and capability address; a WebSocket session and
  presence; a web scene revision; a module with a fixed component tree, mode
  and optional data source; a pull-source subscriber and cache; a node scene
  cache; a temporary owner-only local hub control socket; a loopback renderer
  boundary.
- **New or changed tables (protected path):** `nodes`, `node_tokens`, `scenes`,
  `scene_versions` and `scene_assignments`, defined below. Schema changes need
  Dan's approval again when the database PR plan is expanded.
- **New or changed protocol messages (protected path):** `hello`, `welcome`,
  `session.ready`, `ping`, `pong`, `display.scene.set`,
  `display.data.update`, `display.state`, `display.resync` and `error`, defined
  below. Protocol changes need Dan's approval again when their PR plans are
  expanded.
- **New dependencies:** `zod` for schemas, inferred types and runtime
  validation; `ws` for the hub WebSocket server; `supersave` and `mysql2` for
  ADR-004 persistence; `happy-dom` for Vitest DOM tests; `@types/ws` only if
  needed by the selected `ws` release. Install with `pnpm --ignore-scripts`.
  HTTP, IDs, hashing, the outbound WebSocket client, the loopback renderer
  service and the renderer use Node or browser APIs already in the target
  runtimes.
- **Reuse-vs-build result:** [Proposed ADR-056](../adr/0056-slice-1-reuses-small-libraries-and-native-node-apis.md)
  reuses narrow libraries and native APIs behind Teletron-owned protocol,
  module, source and rendering boundaries.

### Slice boundaries

The hub remains the source of truth. A Pi node process holds the node token,
opens the one outbound WebSocket connection to the hub, persists the last
accepted scene and data, and serves a loopback-only browser renderer. The kiosk
browser never receives the node token. It receives complete render state over
server-sent events and renders a fixed component tree with DOM and CSS.

The hub also owns a Unix domain control socket for the pairing, revocation and
scene CLIs. It is created with owner-only permissions at the configured local
path and is never exposed through Caddy or a TCP port. CLI processes send one
validated command and receive one response over this socket; the live hub
performs the database transaction and any session update. This is local
operational IPC, not the MCP or HTTP control plane. It is intentionally
temporary: Slice 3 removes the CLI executable, command schemas, socket server
and IPC tests after the agent MCP/API covers node creation, token issuance and
revocation, scene validation/versioning and scene assignment. Slice 1 does not
design this IPC for compatibility or extension.

The hub has two built-in pull-source adapters for this slice:

- `weather.home` calls Open-Meteo with configured latitude and longitude and
  returns current temperature, apparent temperature, weather-code icon token
  and observation time. It refreshes every 15 minutes and considers a value
  fresh for 30 minutes.
- `youtube.followers` calls `channels.list` with `part=statistics` and the
  configured channel ID, and returns the public subscriber count and retrieval
  time. The UI labels the count as rounded because the provider returns it
  rounded to three significant figures. It refreshes every 5 minutes and
  considers a value fresh for 10 minutes.

Both adapters use one shared source lifecycle. A source's subscriber count is
the number of connected, ready display instances whose assigned scene contains
a module bound to that source. The first subscriber starts fetching; the last
subscriber stops it. A fresh cached value is sent immediately. Fetch failures
keep the previous value, record a safe error without credentials and retry at
the next refresh interval. Each source has at most one fetch in flight and a
10-second request timeout. An initial failure renders an unavailable state.
Source cache and revisions are in memory in this slice; the node's scene cache
keeps the last value visible during outages.

Production node URLs must use `wss://`. Tests and explicit development mode may
use `ws://` on loopback. Caddy deployment itself is documented but not
automated in this slice.

### Protocol envelope

Every text frame is one JSON object:

| Field  | Type                 | Required | Meaning                                         |
| ------ | -------------------- | -------- | ----------------------------------------------- |
| `v`    | integer              | Yes      | Protocol major version; Slice 1 is `1`.         |
| `type` | string               | Yes      | Dotted message type.                            |
| `id`   | string               | Yes      | Sender-unique UUID string.                      |
| `ref`  | string               | No       | `id` of the request or message this relates to. |
| `ts`   | non-negative integer | Yes      | Sender time in Unix milliseconds.               |
| `body` | object               | Yes      | Message-specific payload; empty when unused.    |

The handshake also carries a `protocol` string in `major.minor` form. Both
sides reject a different major. Within one major, additions are new message
types or optional fields; receivers ignore unknown object fields. Required
field changes and meaning changes require a new major. JSON text frames are at
most 64 KiB unless the manifest advertises a lower receive limit. Envelope and
message and manifest-capability parameter objects are open to additive fields;
embedded scene, component and grants schemas are closed because unknown
declarative fields could otherwise acquire unintended behavior later.
Concretely, Zod message schemas accept and strip unknown fields, while the
closed declarative schemas reject them. Exported TypeScript types are inferred
from those same schemas with `z.infer`.

Invalid JSON or an invalid known message receives `error/BAD_REQUEST` when a
reply is safe. An unknown command receives `error/UNKNOWN_TYPE`; unknown event,
update, state and acknowledgement types are ignored so an older receiver can
coexist with additive protocol changes. Any pre-authentication message other
than `hello` is rejected as unauthorized and the socket closes.

Slice 1 defines the error codes `BAD_REQUEST`, `UNKNOWN_TYPE`,
`UNSUPPORTED_VERSION`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`,
`STALE_REVISION`, `LIMIT_EXCEEDED` and `INTERNAL`. Every `error` has a safe
human-readable message and `retryable` boolean; it references the triggering
message when that message had a valid ID. Authentication errors never reveal
whether the node ID, name or token was wrong.

Binary framing is specified now but unused by Slice 1. It has a 16-byte,
little-endian header: magic `0x54`, major version, kind (`1` audio, `2` blob),
flags, unsigned 32-bit stream ID, sequence and sender milliseconds. Flag bit 0
marks the final frame; senders leave the other bits zero and receivers ignore
them for additive compatibility. There is no pixel kind and no display-frame
message. Stream lifecycle messages are added in the slice that first needs
binary data.

### Manifest and grants

`hello` contains the node ID, logical node name, token, agent version, supported
protocol version, full manifest and resume state. The manifest contains:

- a monotonically increasing manifest revision and implementation kind;
- receive limits for JSON and binary frames;
- capability entries with `type`, `instance`, `scope` and typed parameters;
- for Slice 1, one `display:web` capability whose parameters include its target
  type and viewport hints.

Capability types use `family:kind`. An instance is addressed everywhere as
`<logical-node-name>/<instance>`, for example `living-room-pi/hdmi`. Names and
instances use lowercase ASCII letters, digits and hyphens, start with a letter
or digit, and are each at most 63 characters. Capability scope is `local` or
`shared`; the first display is local.

The pairing CLI stores a closed JSON array of exact
`{ type, instance, scope }` grants on a token. The hub derives the authenticated
node from the token hash, verifies the claimed node ID and name, and divides
the manifest into granted and rejected entries. Changing `local` to `shared`
is therefore a rejected permission elevation. The hub never elevates a
manifest entry and does not have a pending-grant workflow in this slice.
`welcome` returns the canonical node identity, selected protocol, session ID,
hub time, the hub process's data-generation UUID, heartbeat settings, limits
and the granted/rejected addresses.

### Connection lifecycle

The hub accepts node upgrades only at `/ws`; the node appends that path to the
configured hub origin. The first frame must be a valid `hello` within five
seconds. After `welcome`,
the hub replays the current scene only when its revision differs from the
node's resume state, replays newer module data, then sends `session.ready`.
Presence begins at successful authentication and ends immediately when the
socket closes or misses its heartbeat.

The hub uses WebSocket ping/pong. JSON `ping`/`pong` has the same liveness
meaning for future browser nodes. The initial interval is 10 seconds with a
25-second timeout. The node reconnects after 1 second, doubles to a 30-second
cap, adds 0–50 percent jitter and resets after 60 seconds ready.

Only one connection for a token is active. A new authenticated connection
becomes current before the hub closes the old one with code `4010`; the old
client must not reconnect on that code. The hub logs node ID, token ID and both
session IDs, never the token. Close codes are:

| Code   | Meaning                      | Node behaviour                      |
| ------ | ---------------------------- | ----------------------------------- |
| `4001` | Unsupported protocol major   | Stop and show configuration error.  |
| `4002` | Unauthorized or revoked      | Stop and show authentication error. |
| `4004` | Heartbeat timeout            | Reconnect with backoff.             |
| `4008` | Control backpressure         | Reconnect with backoff.             |
| `4009` | Frame limit exceeded         | Stop and show configuration error.  |
| `4010` | Replaced by newer connection | Stop without reconnecting.          |
| `1012` | Hub restarting               | Reconnect with backoff.             |

Slice 1 queues at most 256 outbound control messages per connection and closes
with `4008` rather than dropping one. There are no event, audio or blob queues
yet.

### Module and scene format

A stored scene has a stable database ID and unique name. Its versioned JSON
defines target `web`, a theme token, a grid layout and unique module instances;
the ID is protocol/storage metadata, not author-written JSON. The grid declares
one to twelve columns and rows plus gap and padding tokens. Each module
placement declares one-based row and column plus spans that must fit in the
grid. Slice 1 has one theme, `dark`; spacing tokens are `none`, `small`,
`medium` and `large`.

Each inline module spec declares:

- `id`, unique within the scene;
- `mode`: `local`, `data` or `mixed`, as required by ADR-020;
- an optional built-in source ID, required for `data` and `mixed` in Slice 1;
- one fixed component tree.

Slice 1 component types are `stack`, `text`, `big-number` and `icon`. `stack`
is the only container and has a row/column direction, alignment and gap token.
Leaf values are a literal, a local clock value with a validated format, or a
dot-separated field path into the module's data object. Literals are strings
or finite numbers. Path segments use
ASCII letters, digits and underscores, start with a letter, and reject
`__proto__`, `prototype` and `constructor`. Clock formats are
`HH:mm` and `HH:mm:ss`. Styling is limited to sizes `small`, `medium`, `large`,
`x-large` and `hero`; weights `regular` and `bold`; tones `default`, `muted`,
`accent` and `warning`; and alignment `start`, `center` and `end`. Icon values
are fixed tokens: `weather-clear`, `weather-partly-cloudy`, `weather-cloudy`,
`weather-fog`, `weather-drizzle`, `weather-rain`, `weather-snow`,
`weather-thunderstorm`, `weather-unknown` and `people`. Scene JSON has no fields
for HTML, CSS, URLs, scripts or event handlers; all string values render as
text. Unknown component types or tokens fail validation. Chart, image, sprite,
character, animation and pixel layouts are additive future component variants,
not free-form escape hatches.

`display.scene.set` sends the full validated scene, its per-display monotonic
`sceneRev`, and each data module's current data plus `dataRev` when available.
`display.data.update` fully replaces one module's data and includes display
address, scene revision, module ID and a data revision made of the current hub
data-generation UUID plus a monotonically increasing sequence. There is no
merge mode. Within one generation the node drops a sequence that is not newer.
After authenticated `welcome` announces a new generation, the node accepts its
first sequence even when the cached generation had a higher number, and never
accepts the previous generation again during that session. This lets the hub
keep its source cache in memory without stale revision lockout after a restart.
The node requests `display.resync` when an update names the wrong scene revision
or an unknown module.

After applying and atomically caching state, the node sends `display.state`
with its display address, scene revision, module data revisions and whether the
state is cached. It also sends state after reconnect and every 60 seconds. The
cache is stored under the configured node state directory with owner-only
permissions and contains no token or provider credential.

The loopback renderer listens only on `127.0.0.1`. A newly opened page receives
the complete current render state before incremental server-sent events. When
the hub disconnects, the renderer adds a visible offline marker, keeps the last
scene and data unchanged, and continues local clock ticks. When the hub returns,
the marker clears only after `session.ready`.

### Configuration

Configuration is read from environment variables and validated once at process
startup. A variable is required only in the process that uses it; source
credentials/configuration are required when an assigned scene references that
source. Secrets are never included in validation errors.

| Process             | Variables                                                        |
| ------------------- | ---------------------------------------------------------------- |
| Hub core            | `DATABASE_URL`, `HUB_PORT`, `HUB_CONTROL_SOCKET`                 |
| Weather source      | `WEATHER_LATITUDE`, `WEATHER_LONGITUDE`                          |
| YouTube source      | `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID`                          |
| Pi node identity    | `HUB_URL`, `NODE_ID`, `NODE_NAME`, `NODE_TOKEN`, `NODE_INSTANCE` |
| Pi node local state | `NODE_STATE_DIR`, optional `NODE_RENDERER_PORT` (default `8081`) |

`HUB_CONTROL_SOCKET` is an absolute path in an existing owner-only directory.
The Pi renderer always binds `127.0.0.1` regardless of configuration. Weather
coordinates are finite values in their geographic ranges and requests use
Celsius. `HUB_URL` is an origin without a path. IDs, names, instances, URLs and
port ranges use the protocol/config validators rather than ad-hoc coercion.

### Data model

All timestamps are UTC. IDs are UUID strings generated by the application.
JSON columns are validated by application schemas before write and after read.

| Table               | Purpose                                    | Required fields and constraints                                                                                                                                                                                     |
| ------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nodes`             | Stable logical node identity.              | `id` primary key; unique immutable `name`; `created_at`.                                                                                                                                                            |
| `node_tokens`       | Node credentials and exact grants.         | `id` primary key; `node_id` foreign key; unique SHA-256 `token_hash`; validated `grants` JSON; `created_at`; nullable `revoked_at`; index on `node_id`. The Slice 1 CLI refuses a second active token for one node. |
| `scenes`            | Stable scene identity.                     | `id` primary key; unique `name`; `created_at`.                                                                                                                                                                      |
| `scene_versions`    | Immutable scene JSON versions for ADR-034. | `id` primary key; `scene_id` foreign key; positive `version`; validated `spec` JSON; `created_at`; unique (`scene_id`, `version`).                                                                                  |
| `scene_assignments` | Current scene for a display capability.    | `node_id` foreign key; `instance`; `scene_version_id` foreign key; positive monotonic `revision`; `updated_at`; primary key (`node_id`, `instance`).                                                                |

Deleting nodes, tokens and scenes is outside this slice. Foreign keys restrict
those deletes. After a scene update, the same transaction prunes unassigned
versions only when they are older than 30 days and outside the newest 20; this
implements ADR-034's "last 20 or 30 days, whichever keeps more" rule. An
assigned version is never pruned.

### Pairing and scene CLIs

The pairing CLI sends its command through the live hub's owner-only control
socket. The hub creates a node name and one token with explicit grants in one
database transaction. The token is 32 random bytes encoded as base64url; only
its SHA-256 hash is stored. The command prints node ID, node name and plaintext
token once to standard output. Errors and logs never repeat it. A revoke
command sets `revoked_at` and closes the active session for that token before
responding. A separate issue-token command creates a replacement for the same
logical node only after its previous token is revoked; it has the same one-time
output and can carry new explicit grants. There is no atomic rotation in this
slice.

The scene CLI validates a JSON file through `@teletron/protocol`, then sends it
through the same control socket. The hub validates again, creates an immutable
next scene version and assigns it to an existing granted `display:web` instance
in one transaction. Reapplying JSON semantically equal to the current version
is a no-op that returns the current version and assignment revision. A real
change always increments the per-display assignment revision and updates the
active session before the command succeeds. This temporary CLI is the only
scene write path until the MCP control plane.

### Wire-protocol proposal conflict resolutions

| #   | Resolution in this spec                                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Production uses `wss://` through Caddy; no Tailscale assumption.                                                                                                  |
| 2   | Remove pixel binary frames and `display.frames.*`; nodes render.                                                                                                  |
| 3   | Remove `pair.request`, `pair.pending` and `pair.result`; the hub CLI creates the node and token.                                                                  |
| 4   | Keep an opaque UUID node ID plus an immutable logical name; both appear in the handshake. Add close code `4010`, on which the replaced client does not reconnect. |
| 5   | Derive addresses as `<node name>/<instance>`; retain `family:kind` as capability type.                                                                            |
| 6   | Defer `cost`, `quality`, `location`, call hints and hard requirements to Slice 8 because Slice 1 has no router or calls. They are additive manifest fields.       |
| 7   | Add capability `scope` now, with `local` for the first display.                                                                                                   |
| 8   | Defer bridge catalog/subscription/value messages and the Home Assistant node to Slice 7.                                                                          |
| 9   | Defer pushed-source value messages to Slice 7; Slice 1 sources are hub-owned pull adapters.                                                                       |
| 10  | Defer `confirm.request` and `confirm.response` to Slice 7; confirmation is not an overlay or generic input match.                                                 |
| 11  | Defer call/session person identity to Slice 9.                                                                                                                    |
| 12  | Defer voice messages to Slice 9; the future voice loop runs on the node and input voice events are triggers only.                                                 |
| 13  | Replace free module `type`/`spec`, grid assumptions and `rendererUrl` with the fixed component and web-grid schemas above. Renderer code ships with the node.     |
| 14  | Defer content-hash asset fetch to Slice 5. Keep a generic future blob binary kind; images are not sent as ad-hoc blobs.                                           |
| 15  | Remove the ESP32 and C++ minimum client. All nodes are TypeScript.                                                                                                |
| 16  | Remove live frame streaming. The future iPixel panel receives node-rendered GIFs/images over Bluetooth.                                                           |
| 17  | Defer TTS and its optional viseme chunks to Slice 9; the binary envelope leaves room for audio without defining calls early.                                      |

## PR Plan

Each entry gets a full implementation plan from `pr-template.md` before work
starts. Acceptance-test IDs refer to the tests below.

1. [ ] **feat(protocol): define the v1 envelope and binary header** — Add the
       Zod-backed envelope, error shape, version rules, limits and pure binary
       header codec. Cover AT-P01 through AT-P06; verify with protocol unit tests.
2. [ ] **feat(protocol): define node session messages** — Add names, addresses,
       capability manifests, resume state and `hello`/`welcome`/`session.ready`/
       heartbeat schemas without I/O. Cover AT-P07 through AT-P11; verify with
       valid and invalid fixtures.
3. [ ] **feat(protocol): define web scenes and display messages** — Add the
       fixed component tree, web grid, scene and display-message schemas. Cover
       AT-M01 through AT-M08; verify with fixtures for all three wall modules and
       rejected free-form content.
4. [ ] **feat(hub): persist nodes and token grants with supersave** — Add the
       supersave/MySQL boundary and only the `nodes` and `node_tokens` schema in
       this PR. Cover AT-D01 through AT-D04 using isolated database integration
       tests; keep WebSocket I/O out.
5. [ ] **feat(hub): add node pairing and revocation commands** — Add CLI
       commands plus the owner-only local control socket for one-time token
       issuance with explicit grants and revocation. Keep active-session closure as
       an injectable boundary until the WebSocket PR. Cover AT-C01 through AT-C07;
       verify IPC, stdout/stderr and database state.
6. [ ] **feat(hub): authenticate and track WebSocket node sessions** — Add the
       `ws` server, hello deadline, grant enforcement, heartbeat, bounded control
       queue, presence and newest-connection-wins behavior. Cover AT-H01 through
       AT-H10; verify with in-process WebSocket integration tests.
7. [ ] **feat(node): connect and resume a Pi display node** — Add configuration,
       the native WebSocket client, handshake, close-code behavior, reconnect
       backoff and atomic owner-only cache, without rendering. Cover AT-N01 through
       AT-N09; verify with a fake hub and temporary state directory.
8. [ ] **feat(hub): persist and assign versioned web scenes** — Add scene tables,
       scene validation/apply CLI, assignment revisions and session replay. Cover
       AT-D05 through AT-D11 and AT-S01 through AT-S05; verify with database and
       WebSocket integration tests.
9. [ ] **feat(node): render cached web scenes and a local clock** — Add the
       loopback-only HTTP/SSE service, fixed DOM component renderer, complete-state
       bootstrap, clock ticks and offline marker. Cover AT-R01 through AT-R09;
       verify renderer tests in Vitest's happy-dom environment plus a loopback
       HTTP/SSE integration test.
10. [ ] **feat(hub): run pull sources only for visible subscribers** — Add the
        shared in-memory source cache, subscriber lifecycle, refresh scheduling,
        safe failures and display data fan-out using fake adapters. Cover AT-SR01
        through AT-SR09; verify with fake timers and fake sources.
11. [ ] **feat(hub): show current weather from Open-Meteo** — Add configuration,
        response validation and mapping for `weather.home`, then place its module
        in the example scene. Cover AT-W01 through AT-W05; verify with mocked HTTP
        responses and the display integration test.
12. [ ] **feat(hub): show YouTube followers on the first display** — Add secret
        configuration, response validation and mapping for `youtube.followers`,
        complete the three-module example scene and document Pi/Caddy startup.
        Cover AT-Y01 through AT-Y06 and AT-E01 through AT-E04; verify with mocked
        HTTP plus the end-to-end wall-scene test.

## Non-goals

- Scheduling, playlists, conditions, dynamic durations and fallback selection.
- MCP, HTTP control APIs, a management UI or agent permissions.
- Remote access to the local hub control socket or a general-purpose local API.
- Compatibility or continued support for the temporary local CLI/IPC after
  Slice 3 provides the agent MCP/API replacement.
- Events, rules, overlays, inputs, actions or confirmation flows.
- Generic agent-defined sources, push sources, webhooks, bridges, history,
  rollups or persistent hub-side source caches.
- Capability calls, provider routing, cost/quality/location scoring, audio,
  TTS, STT, LLMs, assistants, people, memory, characters or pets.
- Pixel layouts, iPixel Bluetooth control, animations, assets, chart/image/
  sprite/character rendering or an expression language.
- Manifest updates or grant editing while connected. Reconnect with the same
  manifest after issuing a differently granted token.
- Atomic token rotation/expiry, deletion, backups, automated
  VPS/Pi provisioning or automated Caddy certificate management.
- Multiple active scenes, multiple hubs, raw frame streaming, an ESP32 client,
  node-to-node connections or arbitrary HTML/CSS/JavaScript in scene data.

## Acceptance Tests

<!-- Acceptance tests continue below by concern. Every item becomes a test. -->

### Protocol

- [ ] **AT-P01:** Given every required envelope field, when it is validated,
      then it is accepted and its inferred type contains no `any`.
- [ ] **AT-P02:** Given invalid JSON, a missing required field, a non-object
      body or a frame over the negotiated limit, when it is decoded, then it is
      rejected with the appropriate `BAD_REQUEST` or `LIMIT_EXCEEDED` result.
- [ ] **AT-P03:** Given unknown fields in a valid envelope and body, when it is
      decoded, then the known fields are accepted and the unknown fields do not
      alter behavior.
- [ ] **AT-P04:** Given a different protocol major, when negotiation runs, then
      it fails with `UNSUPPORTED_VERSION`; given a higher minor on the same major,
      then the compatible supported minor is selected.
- [ ] **AT-P05:** Given audio or blob header values, when they are encoded and
      decoded, then every field round-trips in little-endian order.
- [ ] **AT-P06:** Given a binary header with bad magic, unsupported version,
      unknown kind or insufficient bytes, when decoded, then it is rejected; no
      pixel kind is accepted.
- [ ] **AT-P07:** Given valid node and instance names, when an address is built,
      then it is `<node>/<instance>`; invalid characters, empty parts and parts
      over 63 characters are rejected.
- [ ] **AT-P08:** Given a valid `display:web` capability, when its manifest is
      validated, then its type, instance, local scope, limits and parameters are
      retained.
- [ ] **AT-P09:** Given duplicate capability `(type, instance)` pairs or an
      invalid manifest revision, when validated, then the manifest is rejected.
- [ ] **AT-P10:** Given each Slice 1 session message, when a valid and invalid
      fixture is decoded, then only the valid fixture produces the typed body.
- [ ] **AT-P11:** Given a manifest capability or scope not present in the token
      grants, when grants are classified, then it is rejected and never treated as
      pending or granted.

### Modules and scenes

- [ ] **AT-M01:** Given the clock module, when validated, then a local clock
      binding and `mode: local` are accepted without a source.
- [ ] **AT-M02:** Given weather and follower modules, when validated, then
      `mode: data`, their built-in source IDs and data-field bindings are accepted.
- [ ] **AT-M03:** Given a data or mixed module without a source, or a local
      module with a source, when validated, then the scene is rejected.
- [ ] **AT-M04:** Given stack, text, big-number and icon components using valid
      style tokens, when validated, then the complete component tree is accepted.
- [ ] **AT-M05:** Given an HTML, CSS, URL, script or event property, an unknown
      component/style token or an unsafe data path segment, when validated, then
      the scene is rejected; markup-looking string literals remain inert text.
- [ ] **AT-M06:** Given duplicate module IDs or a placement outside the positive
      web grid, when validated, then the scene is rejected.
- [ ] **AT-M07:** Given a scene for a target other than `web`, when assigned to
      `display:web`, then assignment fails with a clear target mismatch.
- [ ] **AT-M08:** Given each display message, when a valid and invalid fixture
      is decoded, then only valid scene, module and revision combinations pass.

### Database and CLIs

- [ ] **AT-D01:** Given an empty database, when migrations run, then the node
      and token tables, keys, indexes and restrictions match this spec.
- [ ] **AT-D02:** Given duplicate node names or token hashes, when inserted,
      then the database rejects them.
- [ ] **AT-D03:** Given malformed grants JSON read from storage, when the data
      boundary loads it, then it fails closed before authentication.
- [ ] **AT-D04:** Given a node with an active token, when another token issuance
      is attempted, then it is rejected without changing either record.
- [ ] **AT-D05:** Given an empty database, when the scene migration runs, then
      scene, version and assignment tables match this spec.
- [ ] **AT-D06:** Given a new valid scene, when applied, then immutable version
      1 and an assignment revision are committed together.
- [ ] **AT-D07:** Given an updated valid scene, when applied, then a new
      immutable version and higher assignment revision are created without
      modifying the earlier version.
- [ ] **AT-D08:** Given invalid scene JSON, an unknown node, an ungranted display
      instance or a target mismatch, when apply runs, then nothing is written.
- [ ] **AT-D09:** Given an attempted delete of a referenced node or scene
      version, when executed, then foreign-key restrictions reject it.
- [ ] **AT-D10:** Given more than 20 scene versions across more than 30 days,
      when another version is applied, then only unassigned versions outside both
      retention windows are pruned and all assigned versions remain.
- [ ] **AT-D11:** Given scene JSON semantically equal to the assigned current
      version, when apply runs, then it returns the current IDs without adding a
      version, changing the assignment revision or sending a scene update.
- [ ] **AT-C01:** Given a valid unique name and explicit display grant, when the
      pairing command succeeds, then it prints node ID, name and a 32-byte
      base64url token exactly once.
- [ ] **AT-C02:** Given a created token, when storage and captured logs are
      inspected, then only its SHA-256 hash exists and the plaintext is absent.
- [ ] **AT-C03:** Given an invalid/duplicate name or invalid/duplicate grant,
      when pairing is attempted, then it fails without a partial node or token.
- [ ] **AT-C04:** Given an active token, when it is revoked, then `revoked_at`
      is set, the command does not expose the token and the active-session boundary
      is invoked.
- [ ] **AT-C05:** Given an already revoked or unknown token ID, when revocation
      is attempted, then it fails clearly and changes nothing else.
- [ ] **AT-C06:** Given a logical node whose prior token is revoked, when a
      replacement is issued, then the node ID and name stay unchanged, new grants
      are stored and the new plaintext token is shown exactly once.
- [ ] **AT-C07:** Given the hub control socket, when its listener and filesystem
      entry are inspected, then it is a Unix socket available only to the hub OS
      user; malformed or multi-command connections fail without a database write.

### Hub sessions and scenes

- [ ] **AT-H01:** Given no first message or a non-hello first message, when five
      seconds pass or the frame arrives, then the hub closes unauthenticated.
- [ ] **AT-H02:** Given an unknown, malformed or revoked token, or mismatched
      node ID/name, when hello arrives, then the hub returns only `UNAUTHORIZED`,
      closes with `4002` and reveals no credential detail.
- [ ] **AT-H03:** Given a valid token and manifest, when hello arrives, then the
      hub sends welcome with canonical identity, selected protocol, settings and
      exact granted/rejected addresses and marks the node present.
- [ ] **AT-H04:** Given a granted manifest entry plus an ungranted one, when the
      node connects, then only the granted display becomes usable.
- [ ] **AT-H05:** Given an active connection and a newer valid connection using
      the same token, when the latter authenticates, then it becomes current, the
      old one closes with `4010` and the takeover log contains IDs but no secret.
- [ ] **AT-H06:** Given a current session, when it closes or misses the heartbeat
      timeout, then presence and source subscriptions end immediately.
- [ ] **AT-H07:** Given regular frames or pongs inside the timeout, when
      heartbeat checks run, then the session remains present.
- [ ] **AT-H08:** Given 257 unsent control messages, when enqueued, then no
      control message is dropped and the session closes with `4008`.
- [ ] **AT-H09:** Given an unknown command after authentication, when received,
      then the hub returns `UNKNOWN_TYPE`; given an unknown event/update/state/ack,
      it ignores it without closing.
- [ ] **AT-H10:** Given a connected token that is revoked, when revocation
      commits, then its session closes with `4002` and presence ends immediately.
- [ ] **AT-S01:** Given a ready display whose resume revision differs, when the
      session restores, then the hub sends the full assigned scene and latest
      module snapshots before `session.ready`.
- [ ] **AT-S02:** Given a ready display with the current scene and data
      revisions, when the session restores, then the hub does not resend unchanged
      state and still sends `session.ready`.
- [ ] **AT-S03:** Given an online display, when a new scene version is assigned,
      then it receives exactly one higher `sceneRev` and acknowledges it with
      `display.state` after caching.
- [ ] **AT-S04:** Given a `display.resync` request for the authenticated display,
      when handled, then the hub sends the full current scene and data; a request
      for another address is forbidden.
- [ ] **AT-S05:** Given a stale `display.state`, when received, then it cannot
      lower hub state or assignment revision.

### Pi node and renderer

- [ ] **AT-N01:** Given complete valid configuration, when the node starts, then
      it connects to the configured hub and sends hello with manifest and cache
      resume revisions.
- [ ] **AT-N02:** Given missing/invalid configuration or a non-`wss://`
      production URL, when the node starts, then it fails before opening a socket
      and does not print the token.
- [ ] **AT-N03:** Given a transient close, when reconnecting, then delays start
      at 1 second, double to at most 30 seconds, include bounded jitter and reset
      only after 60 seconds ready.
- [ ] **AT-N04:** Given close `4001`, `4002`, `4009` or `4010`, when handled,
      then the node stops reconnecting and exposes the corresponding safe status.
- [ ] **AT-N05:** Given a valid higher scene revision, when received, then the
      node atomically caches and applies it before acknowledging.
- [ ] **AT-N06:** Given a lower scene revision, non-increasing sequence in the
      current data generation or a superseded generation, when received, then the
      node ignores it; given the generation announced by a new welcome, then its
      first sequence is accepted without discarding cached data prematurely.
- [ ] **AT-N07:** Given data for the wrong scene or unknown module, when
      received, then the node keeps its state and sends `display.resync`.
- [ ] **AT-N08:** Given a write interruption, when the node restarts, then it
      loads the last complete cache rather than a partial file.
- [ ] **AT-N09:** Given the cache directory and files, when permissions are
      inspected, then they are owner-only and contain no node/provider secret.
- [ ] **AT-R01:** Given a renderer request from a non-loopback interface, when
      the service is configured, then it is not listening there.
- [ ] **AT-R02:** Given a browser opens after state already exists, when its SSE
      stream starts, then complete current state arrives before later updates.
- [ ] **AT-R03:** Given the three-module example scene, when rendered, then the
      clock, weather and rounded follower count occupy their declared grid cells.
- [ ] **AT-R04:** Given each allowed component and style token, when rendered,
      then it produces only renderer-owned DOM classes and text/icon content.
- [ ] **AT-R05:** Given a missing initial data value, when rendered, then the
      module shows a clear unavailable/loading placeholder without breaking layout.
- [ ] **AT-R06:** Given a hub disconnect after a scene was cached, when the
      renderer updates, then it adds an offline marker, keeps scene/data unchanged
      and does not dim them.
- [ ] **AT-R07:** Given the hub remains offline, when minutes change, then the
      local clock continues to update without hub data.
- [ ] **AT-R08:** Given the hub reconnects, when state replay completes, then
      the offline marker clears only after `session.ready`.
- [ ] **AT-R09:** Given no hub at node startup but a valid cache, when the kiosk
      page opens, then it renders that cache and the offline marker.

### Pull sources and integrations

- [ ] **AT-SR01:** Given zero source subscribers, when time advances, then no
      adapter fetch occurs.
- [ ] **AT-SR02:** Given the first ready display subscriber, when it appears,
      then one immediate fetch starts; further subscribers share it.
- [ ] **AT-SR03:** Given all subscribing displays disconnect or change scene,
      when counts reach zero, then scheduled fetches stop.
- [ ] **AT-SR04:** Given a fresh cached value when a subscriber appears, then it
      is sent immediately without another fetch until refresh is due.
- [ ] **AT-SR05:** Given a successful refresh, when mapped data differs or is
      unchanged, then data revisions increase only for an emitted full replacement
      and all subscribed module instances receive it.
- [ ] **AT-SR06:** Given a fetch failure after a cached success, when handled,
      then the prior value remains, no dim/blank update is sent and a credential-
      free error is recorded.
- [ ] **AT-SR07:** Given an initial fetch failure with no cache, when handled,
      then the affected module receives/shows unavailable state and retries at the
      next interval.
- [ ] **AT-SR08:** Given a scene with two modules bound to one source, when it
      becomes visible, then that display contributes one source subscriber while
      both module instances receive mapped updates.
- [ ] **AT-SR09:** Given a stale result from a cancelled or superseded fetch,
      when it resolves, then it cannot overwrite the newer cache value.
- [ ] **AT-W01:** Given configured coordinates and an active subscriber, when
      weather fetches, then the request contains only the required Open-Meteo
      current fields and no credential.
- [ ] **AT-W02:** Given a valid Open-Meteo response, when mapped, then numeric
      temperatures, observation time and a supported icon token are emitted.
- [ ] **AT-W03:** Given an unknown weather code, when mapped, then a neutral
      fallback icon token is emitted rather than rejecting otherwise valid data.
- [ ] **AT-W04:** Given an HTTP error or malformed response, when fetched, then
      the shared source failure behavior applies.
- [ ] **AT-W05:** Given missing or invalid coordinates while the source is
      referenced, when the hub starts, then configuration fails clearly.
- [ ] **AT-Y01:** Given an active subscriber, when followers fetch, then the
      request uses `channels.list`, `part=statistics`, the configured channel ID
      and API key on the hub only.
- [ ] **AT-Y02:** Given a valid public subscriber count, when mapped, then it is
      emitted as a safe integer with `rounded: true` and retrieval time.
- [ ] **AT-Y03:** Given a hidden subscriber count, empty item list, unsafe
      integer, HTTP error or malformed response, when fetched, then the shared
      source failure behavior applies with a safe provider-specific reason.
- [ ] **AT-Y04:** Given logs, protocol frames, node cache and renderer state,
      when inspected after a fetch, then the YouTube API key is absent.
- [ ] **AT-Y05:** Given the source is referenced but its API key or channel ID
      is missing, when the hub starts, then configuration fails clearly without
      printing the key.
- [ ] **AT-Y06:** Given subscriber count text on the wall, when rendered, then
      its label states that the provider count is rounded.

### End to end

- [ ] **AT-E01:** Given MySQL, a paired Pi display and the example scene, when
      hub and node start, then one kiosk page shows a live clock, current weather
      and the rounded YouTube follower count.
- [ ] **AT-E02:** Given that working wall scene, when the hub stops, then within
      the heartbeat timeout the offline marker appears, values remain and the
      clock continues.
- [ ] **AT-E03:** Given the cached offline wall scene, when the node restarts
      while the hub remains unavailable, then the same scene returns without the
      hub and is marked offline.
- [ ] **AT-E04:** Given the offline wall scene, when the hub returns, then the
      node reconnects, replays only newer state and removes the marker after ready.

## Shortcuts

- **Two built-in sources:** Weather and YouTube adapters are code plus
  environment configuration, not agent-defined specs. Revisit in Slice 6 when
  generic pull sources and history have a concrete consumer.
- **In-memory hub source cache:** A hub restart refetches visible sources. The
  display still has its disk cache. Revisit with source history in Slice 6.
- **Fixed first component subset:** Slice 1 implements only stack, text,
  big-number and icon. Add the already-decided chart, image, sprite and
  character variants in the slices that use them.
- **No expression language:** Simple literal, local-clock and data-field
  bindings cover the first scene. Choose the one expression language when
  transforms, conditions or dynamic durations first require it.
- **Temporary local control stack:** Pairing, revocation and scene operations
  use a validated local CLI over an owner-only Unix socket only until Slice 3.
  Slice 3 must remove that transport and its command schemas/tests once the
  agent MCP/API provides equivalent operations; it need not remain backward
  compatible.
- **Loopback browser boundary:** HTTP/SSE is one-way because Slice 1 has no
  inputs. Add the smallest bidirectional mechanism only when a display input is
  implemented.
- **No atomic token rotation:** A node has at most one active token. Revoke,
  then issue its replacement deliberately. Add an atomic rotation flow when
  operating a real replacement shows the needed UX.
