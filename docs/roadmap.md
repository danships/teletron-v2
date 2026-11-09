# Roadmap

The roadmap is rolling (ADR-043). Work in thin slices. Each slice ends with something visible on the wall. Each slice needs an approved spec in [specs/](specs/README.md) before coding starts. The spec splits the slice into PRs of less than 600 changed lines. Split the later slices when their turn comes, not before.

Update the status column when a slice starts or finishes. Dan approves changes to the order.

| Slice | Name                              | Status      |
| ----- | --------------------------------- | ----------- |
| 1     | Hub and first display             | In progress |
| 2     | Scheduling                        | Planned     |
| 3     | MCP control plane                 | Planned     |
| 4     | Events and overlays               | Planned     |
| 5     | iPixel panel and animation        | Planned     |
| 6     | Agent-defined sources and history | Planned     |
| 7     | Bridges and actions               | Planned     |
| 8     | Capability router                 | Planned     |
| 9     | Assistant                         | Planned     |
| 10    | Pet                               | Planned     |
| 11    | Later                             | Backlog     |

## 1. Hub and first display

- Hub and one Pi web display node.
- Modules: clock, weather, YouTube followers.
- One scene for each display.
- Design the message envelope and the module spec properly from day one. They are the base for all later slices.
- Includes pairing with a node token (ADR-007) and the first supersave tables.

Proposed PR split. This is a starting point for the slice 1 spec, not an approved plan:

1. **Protocol envelope:** types and validation in `packages/protocol`, with tests. No I/O. Input: [proposal 001](proposals/001-wire-protocol-draft.md). Resolve its conflict list in the spec.
2. **Module spec:** types for the component library and the web layout, with validation tests.
3. **Hub database:** supersave on MySQL, with tables for nodes and tokens. Store only the token hash.
4. **Temporary pairing CLI:** create a node and show its token one time. Slice 3
   replaces and removes the local CLI/IPC control stack.
5. **Hub WebSocket server:** token authentication, manifest, presence tracking, newest connection wins.
6. **Node client:** connect, send the manifest, reconnect, keep the cached scene when the hub is offline.
7. **Scene assignment:** the hub sends one scene to a node address. The node stores it.
8. **Web renderer on the Pi:** render the layout from the module spec. Start with the clock (local-only).
9. **Pull sources:** lazy fetching with subscriber counts and cache. Start with weather.
10. **YouTube followers source:** all three modules are on the wall.

## 2. Scheduling

- Playlists, named schedules, conditions, dynamic durations, fallback scene.

## 3. MCP control plane

- MCP server with versioning and validation.
- Agent-facing MCP/API replaces and removes the temporary local pairing and
  scene CLI/IPC control stack from slice 1.
- From here, agents help to build the rest through MCP.

## 4. Events and overlays

- Events, webhooks, rules and overlays with the priority stack.

## 5. iPixel panel and animation

- The iPixel Color Bluetooth panel through a Pi, with pre-rendered GIF loops and images (ADR-051).
- The panel shows supporting events only, for example attention and thinking.
- Declarative animation and assets on display nodes.

## 6. Agent-defined sources and history

- Pull sources that agents define.
- History rollups.

## 7. Bridges and actions

- Bridge nodes, starting with the Home Assistant add-on.
- Actions with confirmation.

## 8. Capability router

- Capability registry and router.
- The laptop as TTS and LLM provider, with cloud fallback.

## 9. Assistant

- The assistant character, the voice loop on Pi nodes, a mic on each Pi, local wake words.
- Identity on each display, people and memory.
- The `character` component with simple skins, mood tags, lip sync.
- See [characters.md](characters.md).

## 10. Pet

- The pet character on the same screen as the assistant, in one render loop.
- Pet clock, needs, care, sleep, props, pet events with escalation.
- Personal and household pets.
- Skin workflow with preview, test-push and publish. Richer skins (Rive, Live2D, 3D).
- The order of slice 9 and slice 10 is an open question (see [characters.md](characters.md) section 9).

## 11. Later

- Conditional schedules.
- Scoped agent permissions.
