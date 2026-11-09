# Architecture

Teletron is a personal home platform. It combines data sources, visualizations, displays, actions and AI assistants. Agents manage it through MCP. It is a home project, not production grade, but it must grow for years.

Guiding principle: the simplest thing that works today, without blocking the future.

The ADRs in [adr/](adr/README.md) record each decision with its reason. This file gives the full picture. The assistant and the pet are in [characters.md](characters.md).

## 1. Principles

- **Simplicity first.** Add generality only when a concrete feature needs it. Example: no router until a second provider exists.
- **Hub decides, nodes do.** The hub owns state and decisions. Nodes render, speak, listen and bridge.
- **Everything is a capability.** Screens, inputs, voice, LLMs and bridges are announced by nodes and routed the same way.
- **Declarative specs, no arbitrary code.** Sources, modules, scenes, rules and actions are JSON specs. Agents can write them and the hub can validate them.
- **Lazy by default.** Fetch and stream only what is shown or needed.
- **Presence-based, never timeout-based.** The hub always knows what is online. Nothing waits on a dead endpoint.
- **Reuse libraries, do not adopt platforms.** Reuse libraries behind our own interfaces. Build what defines the system.

## 2. System overview

- **Hub:** TypeScript (Node.js) on a VPS that operates 24/7, behind Caddy with Let's Encrypt. MySQL through supersave. The hub owns config, specs, credentials, assets, history, the scheduler, priority stacks, the rules engine, the event bus, the router, the MCP server, people and assistant memory.
- **Nodes:** thin clients that dial out to the hub over one persistent wss:// connection. Examples: a Pi with an HDMI screen, a mic and an iPixel Color panel, a browser tab, the laptop (GPU voice and LLM), a Home Assistant add-on.
- **Hardware (ADR-051, ADR-052):**
  - Raspberry Pi display nodes, each with a screen and a mic. The display of a Pi answers voice from its own mic.
  - An iPixel Color Bluetooth RGB panel, controlled from a Pi with pre-rendered GIF loops and images. It shows supporting events only (attention, hunger, thinking).
  - The laptop for local STT, TTS and LLM, and for the skin preview mode.
  - A GPU box for image generation.
  - There is no ESP32. All code is TypeScript.
- **Virtual nodes:** cloud services (for example a TTS API) that the hub registers itself. Local and remote providers use one code path.

Layers: sources, modules, scenes and scheduler, events and rules, actions, MCP control plane, capability registry and router, assistants.

## 3. Hub

- One service, one database, always on.
- **History:** the latest value matters most. Keep raw values for approximately 48 hours. Then roll them up to hourly and daily aggregates (min, max, avg, last). Each source declares if it keeps history and how to aggregate.
- **Nightly job:** history rollups, version cleanup, asset garbage collection.
- **Hub offline:** nodes continue to show their cached scene with an offline indicator. Locally computed modules (clock, countdowns, animations) continue to run. Nodes do not dim stale data.

## 4. Nodes and pairing

- **Pairing:** create a node on the hub (MCP or CLI). The hub returns a node ID and a token. It shows the token one time and stores only a hash. The token goes into the node config. Revocation disconnects the node immediately.
- A token can carry granted capabilities. A manifest cannot declare more than the token grants.
- **Logical identity:** a node is a name, not hardware. The same token on new hardware takes over the node with its scenes.
- **One connection per token:** the newest connection wins. The hub disconnects the old connection and logs the takeover.
- **Capability instances:** a node announces more than one instance, each addressable, for example `livingroom-pi/hdmi` and `livingroom-pi/matrix`. Bluetooth or other bridging is internal to the node.
- Scenes are assigned directly to node addresses. There is no logical display layer for now.
- **Local-only and shared capabilities:** the built-in speech of a browser is local-only. The GPU voice on the laptop is shared and routable.

## 5. Transport and protocol

- wss:// through Caddy (TLS), with per-node tokens on top.
- One message envelope for manifests, subscriptions, scene assignments, data updates, input events, capability calls (request IDs, streaming) and confirmations.
- After a reconnect or a hub restart, the hub restores the current state and in-flight calls.
- **No raw frames.** The hub sends layouts and data only. Each display node renders itself. For the iPixel Color panel, the Pi renders GIF loops and images and sends them over Bluetooth (ADR-051).
- The protocol lives in `packages/protocol`. Slice 1 designs the envelope.

## 6. Sources

- **Pull sources:** HTTP-based. They declare a refresh interval and a cache time.
- **Lazy fetching:** the hub keeps a subscriber count for each source. It fetches only while a visible scene uses the source. An optional background schedule (for example daily) is possible, mainly for history.
- The cache lets scene switches and overlays show the last value immediately.
- **Push sources:** values pushed by nodes or webhooks are sources too.
- **Bridge nodes:** any external system (Home Assistant, Plex, Frigate, custom sensors) connects the same way. The bridge announces a catalog of sources and actions: names, types and metadata, no values. The hub subscribes only to what is shown. The bridge streams only subscribed values. The hub has no system-specific logic.
- **Allowlist:** a bridge exposes only what is configured on the node. Nothing else is announced, subscribable or callable, also not to a compromised hub.
- Home Assistant is the first bridge, as an HA add-on (container) that reuses the TypeScript node code.
- **Webhooks:** endpoints created on the hub are sources and also fire events.
- **Visibility:** each source is shared or private to one or more people.

## 7. Modules and rendering

- **Fixed component library**, no HTML or code: big number, text, chart, image, icon, sprite, character, layouts. Revisit only for specific cases.
- The **character** component renders an assistant or pet skin. A skin is a data package without scripts. See [characters.md](characters.md) section 3 (ADR-045).
- **Separate layouts per target type** (web, pixel) that share data bindings. A module can support one target only. Placing it on an unsupported target is a clear error.
- **Rendering on nodes only.** One TypeScript pixel renderer serves capable nodes.
- **Declarative animation:** scroll, blink, fade, slide, scene transitions, sprite sheets (base for the pet). Nodes run their own render loop.
- Modules declare if they are local-only, data-driven or mixed, so nodes know what continues to run offline.
- **Assets:** stored on the hub, addressed by content hash, cached on nodes. Agents can upload SVGs and images through MCP. The hub sanitizes SVGs (removes scripts, external references, event handlers). Pixel nodes rasterize to their resolution.
- **Expressions:** one expression language (for example JSONata) for transforms, conditions and dynamic durations.

## 8. Scenes and scheduling

- Each display has playlists. An entry has a duration and an optional condition (show only if relevant).
- **Duration:** fixed, an expression, or a "done" signal from the module (for example scroll once), bounded by a minimum and a maximum.
- Conditions read only cached data. They never trigger fetches.
- Each display has a fallback scene (for example a clock) for when all entries are skipped.
- **Named schedules** (morning, workday, evening) with time ranges and weekdays, mapped to playlists for each display.
- Later: conditional schedules (sunset, someone at home).

## 9. Events, rules and overlays

- Events from webhooks, push sources, inputs and action results go through the event bus.
- Rules map events to overlays with a priority, a duration and an expiry.
- **Priority stack per display:** a higher priority interrupts. Equal or lower priority waits in the queue. An interrupted overlay resumes with its remaining time. Expired overlays are dropped. Optional merge for chatty events ("3 new subscribers").
- **Targeting:** display addresses, tags, or both. Displays without a matching layout are skipped with a warning.
- **Event categories:** each event has a category, for example `pet`. A display configuration lists the categories it accepts. Rules use this list as an extra filter on targets (ADR-048).
- **Escalation:** an overlay priority can go up over time while it is ignored, but never above its ceiling. Pet events start low and stay below important events (ADR-048).

## 10. Actions

- Declarative action specs: HTTP call or bridge action, credential reference, typed inputs, output schema.
- Triggered by display inputs, assistants, MCP agents or event rules. Long-running results (for example image generation) return as events. Generated images can become assets.
- **Confirmation:** an action can require confirmation. The hub creates a pending confirmation (ID, short expiry) and returns it to the originating client. The client asks in its own way (voice, button, touch). No answer means denied.
- **Hard rule:** agents (MCP) and event rules cannot trigger actions that require confirmation. Only a person at a client can start and confirm them.
- Actions are shared or private, the same as sources.

## 11. MCP control plane

- A thin layer over the hub API: nodes, displays, scenes, schedules, sources, modules, rules, actions, assets.
- **One token per agent** (interactive or autonomous) for logs and revocation. Scoped permissions later, if needed.
- **Versioning:** each change to a spec, scene or rule is a new version tagged with the agent. Keep the last 20 versions or 30 days, whichever keeps more. Rollback is easy.
- A **validate and preview tool** lets agents check specs before they go live.
- Specs reference credentials by name. Specs never embed credentials.

## 12. Capabilities and routing

- Providers declare attributes in their manifest: cost, quality tier, location.
- The router removes offline and unsuitable providers, scores the rest and uses Dan's priority as tiebreaker. Example: the laptop GPU voice wins when online (free). The cloud takes over when it disconnects.
- **Request hints:** prefer quality, cost or local. Hints change the weights for each call.
- **Hard requirements** (for example "must be local") fail immediately when nothing matches. Nothing waits.

## 13. Assistants and pet

- **An assistant is a role that a node takes on.** The voice loop runs on the node near the speaker. It calls STT, LLM and TTS through the router (local first). A browser tab can be a full assistant node with built-in speech.
- Data and actions go through a hub tool interface that mirrors MCP, with the same permission and confirmation rules.
- **Triggers per node:** wake word, button, touch. These are input capabilities. Each character has its own wake word (ADR-052).
- **Characters:** the assistant and its pet are two separate characters. Both can share one screen and render in one loop (ADR-044). A character is shared or owned by one person.
- **The hub owns character state:** activity state, mood, needs, props, sleep and memory. Displays only render.
- **Persistent memory** on the hub, as summaries and facts (not full transcripts), with retention rules and a way to view and delete.
- Skins, pet behaviour, lip sync and personal pets are in [characters.md](characters.md).

## 14. People and privacy

- People are a cross-cutting concept.
- Memory is keyed by character and person. It is never mixed.
- **Identification:** a person sets the identity on each display, for example with a "who's here" button on a shared screen. The display keeps the last identified person. Without one, it uses a default identity. There is no presence detection (ADR-049).
- Sources and actions are shared or private to people. Sessions access only what the speaker may use.
- A private source can appear on any screen, also a shared screen, but only its owner (or an agent that acts for the owner) can put it there.
- There is no privacy separation between household members on shared screens. What is on a shared screen is visible to everyone in the room (ADR-050).

## 15. Security baseline

- wss:// with TLS through Caddy. Per-node and per-agent tokens, hashed on the hub.
- Manifests cannot grant new permissions. Bridge allowlists are enforced on the node.
- Actions that require confirmation are human-only.
- SVGs are sanitized. Credentials are never in specs.
- Skins contain no scripts. Downloaded model files are assets, for personal use only (ADR-054).

## 16. Reuse or build

- **Decided:** supersave (Dan's own library) on MySQL for data.
- **Principle:** reuse any library behind our own interfaces. Build the protocol, specs, scheduler model, routing and permission model.
- **Process:** each slice starts with a short reuse-vs-build round. Record the result as an ADR.
- Candidates, when relevant: Vercel AI SDK or Mastra (agent harness), the official MCP TypeScript SDK, JSONata, DOMPurify, a canvas library, an iPixel Bluetooth library, three.js, the Rive and Live2D runtimes, Whisper, Piper, openWakeWord, a small cron library.

## 17. Open questions

- Can agents ever trigger actions that require confirmation? Default: no.
- Pet proactivity: can it speak on its own, for example to react to events?
- Barge-in (interrupt the assistant), avatar animation while it speaks, model per character.
- Node deployment and updates, logging and debugging, backups of MySQL and assets.
- Choice of expression language and agent harness. Decide in the relevant slice.
- Open questions for characters and skins are in [characters.md](characters.md) section 9.
- Out of scope: presence detection.
