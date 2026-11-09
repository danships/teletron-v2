# S1-PR3 — Define web scenes and display messages

- Parent spec: [Spec 001](../001-hub-and-first-display.md)
- Slice PR: 3
- Ticket type: Story

## Overview

Define the closed declarative format for Slice 1 web scenes and their display
messages. The schemas admit the clock, weather and follower modules while
rejecting arbitrary HTML, CSS, scripts, URLs and unsupported target layouts.

---

## Implementation Steps

### Shared protocol package

1. [ ] Obtain approval to change the protected `packages/protocol/` path.
2. [ ] Create `packages/protocol/src/scene.test.ts` with the AT-M01 through
       AT-M07 fixtures before implementation. Include one complete three-module
       scene and one fixture for every rejected free-form property.
3. [ ] Create `packages/protocol/src/display-messages.test.ts` for AT-M08,
       covering each valid message plus wrong revisions, addresses and module IDs.
4. [ ] Add `packages/protocol/src/components.ts` with strict discriminated Zod
       schemas for `stack`, `text`, `big-number` and `icon`. Encode the exact
       direction, alignment, gap, size, weight, tone and icon token enums from
       Spec 001.
5. [ ] Add strict leaf-value variants for literal finite string/number values,
       `HH:mm | HH:mm:ss` local clock bindings and dot-separated data paths.
       Reject empty/invalid segments and `__proto__`, `prototype` and
       `constructor`.
6. [ ] Add `packages/protocol/src/scene.ts` with the strict `web` target, `dark`
       theme, 1–12 row/column grid, tokenized gaps/padding, unique module IDs and
       in-bounds one-based placements. Enforce mode/source combinations and the
       built-in `weather.home | youtube.followers` source IDs.
7. [ ] Add `assertSceneTarget(scene, capability)` as a pure helper that returns
       a clear target-mismatch result for non-web assignments.
8. [ ] Add `packages/protocol/src/display-messages.ts` with schemas and inferred
       types for `display.scene.set`, `display.data.update`, `display.state` and
       `display.resync`. Define full replacement only, positive scene revisions,
       `{ generation, sequence }` data revisions and full initial data snapshots.
9. [ ] Register the display messages with the known-message decoder and export
       public scene/component/display symbols from `index.ts`.
10. [ ] Run protocol tests, verify markup-looking literals remain string data,
        and run `pnpm check`.

---

## Acceptance Tests Covered

- **AT-M01:** Given the clock module, when validated, then a local clock binding
  and `mode: local` are accepted without a source.
- **AT-M02:** Given weather and follower modules, when validated, then
  `mode: data`, their built-in source IDs and data-field bindings are accepted.
- **AT-M03:** Given a data or mixed module without a source, or a local module
  with a source, when validated, then the scene is rejected.
- **AT-M04:** Given stack, text, big-number and icon components using valid style
  tokens, when validated, then the complete component tree is accepted.
- **AT-M05:** Given an HTML, CSS, URL, script or event property, an unknown
  component/style token or an unsafe data path segment, when validated, then the
  scene is rejected; markup-looking string literals remain inert text.
- **AT-M06:** Given duplicate module IDs or a placement outside the positive web
  grid, when validated, then the scene is rejected.
- **AT-M07:** Given a scene for a target other than `web`, when assigned to
  `display:web`, then assignment fails with a clear target mismatch.
- **AT-M08:** Given each display message, when a valid and invalid fixture is
  decoded, then only valid scene, module and revision combinations pass.

---

## Edge Cases & Error Handling

- **Recursive component depth:** Set and test a finite component-tree depth and
  child-count bound that keeps a complete Slice 1 scene under the 64 KiB frame
  limit.
- **Grid overflow:** Reject zero, negative and end positions beyond declared
  rows/columns; adjacent placements may overlap because overlap is not a Slice 1
  concern.
- **Unknown declarative fields:** Use strict schemas throughout the embedded
  scene/component tree even though the outer message body is open.
- **Missing data:** Scene validation permits an initial snapshot to be absent so
  the renderer can show unavailable/loading state.

---

## Security Considerations

- **Input validation:** Closed declarative schemas are the only accepted author
  input and reject executable or externally referenced content.
- **Sensitive data exposure:** Scene/data messages have no credential fields.
- **Audit logging:** None in this pure package.
