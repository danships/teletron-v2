# Architecture decision records

This folder holds the architecture decisions for Teletron. The source for ADR-001 to ADR-043 is the "Teletron Architecture & Plan" document. Its content is in [../architecture.md](../architecture.md) and [../roadmap.md](../roadmap.md). ADR-044 to ADR-055 come from the assistant and pet design, in [../characters.md](../characters.md).

## Rules

- Write one ADR for each decision. Use [template.md](template.md).
- Number ADRs in sequence. Do not reuse a number.
- Do not delete an ADR. To change a decision, write a new ADR and set the old one to `Superseded by ADR-NNN`.
- Record each reuse-vs-build round (ADR-040) as an ADR.
- Agents can propose an ADR with status `Proposed`. Only Dan sets `Accepted`.

## Index

| ID                                                                              | Decision                                                                        | Status                       |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------- |
| [ADR-001](0001-home-project-scope-not-production-grade.md)                      | Home project scope, not production grade                                        | Accepted                     |
| [ADR-002](0002-central-hub-on-a-24-7-vps.md)                                    | Central hub on a 24/7 VPS                                                       | Accepted                     |
| [ADR-003](0003-typescript-for-the-hub-and-node-capable-nodes-c-for-a-future.md) | TypeScript for the hub and Node-capable nodes, C++ for a future ESP32           | Accepted, amended by ADR-051 |
| [ADR-004](0004-mysql-through-supersave.md)                                      | MySQL through supersave                                                         | Accepted                     |
| [ADR-005](0005-hub-plus-thin-nodes-over-one-persistent-websocket.md)            | Hub plus thin nodes over one persistent WebSocket                               | Accepted                     |
| [ADR-006](0006-wss-through-caddy-with-let-s-encrypt-per-node-tokens-on-top.md)  | wss:// through Caddy with Let's Encrypt, per-node tokens on top                 | Accepted                     |
| [ADR-007](0007-pairing-by-creating-the-node-on-the-hub.md)                      | Pairing by creating the node on the hub                                         | Accepted                     |
| [ADR-008](0008-logical-node-identity-newest-connection-per-token-wins.md)       | Logical node identity, newest connection per token wins                         | Accepted                     |
| [ADR-009](0009-everything-a-node-offers-is-an-addressable-capability-instan.md) | Everything a node offers is an addressable capability instance                  | Accepted                     |
| [ADR-010](0010-scenes-assigned-directly-to-node-addresses.md)                   | Scenes assigned directly to node addresses                                      | Accepted                     |
| [ADR-011](0011-presence-based-routing-never-timeout-based.md)                   | Presence-based routing, never timeout-based                                     | Accepted                     |
| [ADR-012](0012-router-scores-providers-on-cost-quality-and-location.md)         | Router scores providers on cost, quality and location                           | Accepted                     |
| [ADR-013](0013-local-only-and-shared-capabilities.md)                           | Local-only and shared capabilities                                              | Accepted                     |
| [ADR-014](0014-lazy-fetching-with-subscriber-counts-optional-background-sch.md) | Lazy fetching with subscriber counts, optional background schedules             | Accepted                     |
| [ADR-015](0015-pushed-data-are-sources-too.md)                                  | Pushed data are sources too                                                     | Accepted                     |
| [ADR-016](0016-generic-bridge-nodes-announce-catalogs-values-stream-only-wh.md) | Generic bridge nodes announce catalogs, values stream only when subscribed      | Accepted                     |
| [ADR-017](0017-bridges-expose-only-a-locally-configured-allowlist.md)           | Bridges expose only a locally configured allowlist                              | Accepted                     |
| [ADR-018](0018-home-assistant-as-the-first-bridge-as-an-ha-add-on.md)           | Home Assistant as the first bridge, as an HA add-on                             | Accepted                     |
| [ADR-019](0019-short-raw-history-plus-hourly-and-daily-rollups.md)              | Short raw history plus hourly and daily rollups                                 | Accepted                     |
| [ADR-020](0020-hub-offline-cached-scene-offline-indicator-local-modules-con.md) | Hub offline: cached scene, offline indicator, local modules continue            | Accepted                     |
| [ADR-021](0021-fixed-component-library-no-html-or-arbitrary-code.md)            | Fixed component library, no HTML or arbitrary code                              | Accepted                     |
| [ADR-022](0022-separate-layouts-per-target-type-shared-data-bindings.md)        | Separate layouts per target type, shared data bindings                          | Accepted                     |
| [ADR-023](0023-rendering-on-nodes-only-no-raw-frames-in-v1.md)                  | Rendering on nodes only, no raw frames in v1                                    | Accepted, amended by ADR-051 |
| [ADR-024](0024-declarative-animation-and-sprites-rendered-by-nodes.md)          | Declarative animation and sprites rendered by nodes                             | Accepted                     |
| [ADR-025](0025-assets-on-the-hub-content-hash-addressed-agent-uploadable-sv.md) | Assets on the hub, content-hash addressed, agent-uploadable, SVGs sanitized     | Accepted                     |
| [ADR-026](0026-one-expression-language.md)                                      | One expression language                                                         | Accepted                     |
| [ADR-027](0027-playlist-entries-with-conditions-and-dynamic-durations-fallb.md) | Playlist entries with conditions and dynamic durations, fallback scene required | Accepted                     |
| [ADR-028](0028-named-schedules-by-time-range-and-weekday-first.md)              | Named schedules by time range and weekday first                                 | Accepted                     |
| [ADR-029](0029-overlay-priority-stack.md)                                       | Overlay priority stack                                                          | Accepted, amended by ADR-048 |
| [ADR-030](0030-rules-target-displays-by-address-tags-or-both.md)                | Rules target displays by address, tags, or both                                 | Accepted, amended by ADR-048 |
| [ADR-031](0031-generic-confirmation-flow-handled-by-the-originating-client.md)  | Generic confirmation flow handled by the originating client                     | Accepted                     |
| [ADR-032](0032-confirmation-required-actions-are-human-only.md)                 | Confirmation-required actions are human-only                                    | Accepted                     |
| [ADR-033](0033-one-mcp-token-per-agent-scoped-permissions-later.md)             | One MCP token per agent, scoped permissions later                               | Accepted                     |
| [ADR-034](0034-versioning-of-specs-scenes-and-rules-with-rollback.md)           | Versioning of specs, scenes and rules with rollback                             | Accepted                     |
| [ADR-035](0035-assistant-is-a-role-a-node-takes-on-the-voice-loop-runs-loca.md) | Assistant is a role a node takes on, the voice loop runs locally                | Accepted                     |
| [ADR-036](0036-characters-per-screen-persistent-memory-as-summaries-and-fac.md) | Characters per screen, persistent memory as summaries and facts                 | Accepted, amended by ADR-044 |
| [ADR-037](0037-people-as-a-cross-cutting-concept-memory-keyed-by-character.md)  | People as a cross-cutting concept, memory keyed by character and person         | Accepted                     |
| [ADR-038](0038-assistant-asks-who-is-speaking-at-session-start.md)              | Assistant asks who is speaking at session start                                 | Superseded by ADR-049        |
| [ADR-039](0039-sources-and-actions-are-shared-or-private.md)                    | Sources and actions are shared or private                                       | Accepted, amended by ADR-050 |
| [ADR-040](0040-reuse-libraries-do-not-adopt-platforms.md)                       | Reuse libraries, do not adopt platforms                                         | Accepted                     |
| [ADR-041](0041-guardrails-for-ai-written-code.md)                               | Guardrails for AI-written code                                                  | Accepted                     |
| [ADR-042](0042-coderabbit-as-reviewer-with-a-simplicity-rubric-new-dependen.md) | CodeRabbit as reviewer with a simplicity rubric, new dependencies flagged       | Accepted                     |
| [ADR-043](0043-rolling-roadmap-of-thin-slices.md)                               | Rolling roadmap of thin slices                                                  | Accepted                     |
| [ADR-044](0044-assistant-and-pet-as-two-characters-on-one-screen-one-render.md) | Assistant and pet as two characters on one screen, one render loop              | Accepted                     |
| [ADR-045](0045-skins-driven-by-states-and-moods-with-fallbacks-and-matched.md)  | Skins driven by states and moods, with fallbacks and matched pairs              | Accepted                     |
| [ADR-046](0046-skin-workflow-agent-made-preview-on-a-laptop-node-draft-test.md) | Skin workflow: agent-made, preview on a laptop node, draft, test-push, publish  | Accepted                     |
| [ADR-047](0047-pet-time-model-compressed-day-slow-needs-nudges-and-no-punis.md) | Pet time model: compressed day, slow needs, nudges and no punishment            | Accepted                     |
| [ADR-048](0048-pet-events-in-the-event-bus-with-slow-escalation-and-a-ceili.md) | Pet events in the event bus with slow escalation and a ceiling                  | Accepted                     |
| [ADR-049](0049-identity-set-explicitly-on-each-display-with-a-default-ident.md) | Identity set explicitly on each display, with a default identity                | Accepted                     |
| [ADR-050](0050-personal-and-household-pets-no-privacy-separation-on-shared.md)  | Personal and household pets, no privacy separation on shared screens            | Accepted                     |
| [ADR-051](0051-no-esp32-ipixel-color-panel-through-a-pi-for-supporting-even.md) | No ESP32; iPixel Color panel through a Pi, for supporting events only           | Accepted                     |
| [ADR-052](0052-a-mic-on-each-pi-and-one-local-wake-word-for-each-character.md)  | A mic on each Pi and one local wake word for each character                     | Accepted                     |
| [ADR-053](0053-simple-lip-sync-volume-or-visemes.md)                            | Simple lip sync: volume or visemes                                              | Accepted                     |
| [ADR-054](0054-downloaded-pre-rigged-models-for-personal-use-only.md)           | Downloaded pre-rigged models, for personal use only                             | Accepted                     |
| [ADR-055](0055-mood-tags-with-assistant-replies.md)                             | Mood tags with assistant replies                                                | Accepted                     |

## Deferred

- If agents may ever trigger actions that require confirmation (ADR-032). The default is no.
