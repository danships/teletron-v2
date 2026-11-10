# S1-PR8 — Persist and assign versioned web scenes

- Parent spec: [Spec 001](../001-hub-and-first-display.md)
- Slice PR: 8
- Ticket type: Story

## Overview

Persist immutable web-scene versions, assign one version directly to a granted
display address and synchronize it through live/resumed sessions. The temporary
scene CLI uses the existing local control socket and is the only Slice 1 scene
write path.

---

## Data Model

### SuperSave documents

Use the native document model defined in the parent spec and ADR-057. A `scenes`
entity has a SuperSave storage `id`, immutable application-unique `name`, UTC
`created_at` and embedded `versions`. Each immutable version has an opaque `id`,
positive `version`, validated JSON `spec` and UTC `created_at`.

Assignments are embedded in node documents, keyed by capability instance. Each
stores scene `scene_id`, `scene_version_id`, positive monotonic `revision` and UTC
`updated_at`. References and uniqueness are checked inside the sole hub's command
queue. No separate version/assignment tables, composite SQL keys, foreign keys or
custom migrations are required. Initialize through SuperSave's repository API.

Save a new version before its assignment and publish only after assignment saves.
Interruption may leave an unassigned version; retry reuses a matching latest
version. An uncertain write result requires rereading storage. There is no
cross-document atomicity or rollback. Pruning runs after assignment persistence,
rechecks all references in the same queue, and may safely leave extra history on
failure. Do not expose scene/node deletion APIs.

---

## Implementation Steps

### Database

1. [ ] Obtain approval before changing protected `apps/hub/src/db/schema/`.
2. [ ] Write failing AT-D05 through AT-D11 database tests before schema and
       repository code, including overlapping commands, interrupted writes, retry and retention fixtures.
3. [ ] Add the scene entity and node assignment document definitions and
       `apps/hub/src/scenes/scene-repository.ts` for lookup, immutable version
       creation, assignment and current-state reads.
4. [ ] Implement `applyScene` inside the shared hub command queue: parse through the shared scene
       schema, verify node and exact granted `display:web` instance, verify target,
       compare canonical parsed JSON, create the next version only on a semantic
       change, and increment the display assignment revision.
5. [ ] After a saved assignment, prune only unassigned versions older than 30
       days and outside the newest 20. Recheck every stored assignment before
       pruning. Cleanup failure retains extra history and reports the assignment
       as saved; do not undo it or retry creating an already saved version.

### Backend

1. [ ] Write AT-S01 through AT-S05 as failing WebSocket/control integration
       tests before adding scene dispatch.
2. [ ] Extend PR5 control schemas/client/CLI with one `scene.apply` command that
       accepts a local JSON file, scene name, node name and instance. Validate in
       the CLI and again in the live hub; never let the client write the DB.
3. [ ] Add `apps/hub/src/scenes/scene-service.ts` to call the queued persistence operation, obtain
       current module snapshots from an injected provider (empty until PR10),
       and notify only the current authenticated matching display after assignment persistence.
4. [ ] Add `apps/hub/src/sessions/display-session.ts` to compare hello resume
       state, send a full `display.scene.set` only when needed, replay newer
       snapshots, then send `session.ready` last.
5. [ ] Handle authenticated `display.state` and `display.resync`: stale state
       never lowers server revisions; resync returns the full current state only
       for the session's own granted address and returns `FORBIDDEN` otherwise.
6. [ ] Ensure a semantically identical apply returns current version/assignment
       IDs without a WebSocket send. A changed apply enqueues exactly one higher
       scene revision before the control command reports success.
7. [ ] Run database, CLI and WebSocket tests, then `pnpm check`.

---

## Acceptance Tests Covered

- **AT-D05:** Given an empty database, when SuperSave initializes, then scene
  documents, embedded versions and node assignments survive reconnect.
- **AT-D06:** Given a new valid scene, when applied, then immutable version 1 and
  an assignment revision are saved in order before publication. Failure between
  writes retains the prior assignment; retry reuses the saved matching latest version.
- **AT-D07:** Given an updated valid scene, when applied, then a new immutable
  version and higher assignment revision are created without modifying the
  earlier version.
- **AT-D08:** Given invalid scene JSON, an unknown node, an ungranted display
  instance or a target mismatch, when apply runs, then nothing is written.
- **AT-D09:** Given an assignment to an absent scene/version, when attempted
  through the hub boundary, then reference validation rejects it before writing.
  Node/scene deletion APIs and SQL foreign-key enforcement are outside scope.
- **AT-D10:** Given more than 20 scene versions across more than 30 days, when
  another version is applied, then only unassigned versions outside both
  retention windows are pruned and all assigned versions remain. Prune failure retains the saved
  assignment and extra history.
- **AT-D11:** Given scene JSON semantically equal to the assigned current version,
  when apply runs, then it returns the current IDs without adding a version,
  changing the assignment revision or sending a scene update.
- **AT-S01:** Given a ready display whose resume revision differs, when the
  session restores, then the hub sends the full assigned scene and latest module
  snapshots before `session.ready`.
- **AT-S02:** Given a ready display with the current scene and data revisions,
  when the session restores, then the hub does not resend unchanged state and
  still sends `session.ready`.
- **AT-S03:** Given an online display, when a new scene version is assigned, then
  it receives exactly one higher `sceneRev` and acknowledges it with
  `display.state` after caching.
- **AT-S04:** Given a `display.resync` request for the authenticated display, when
  handled, then the hub sends the full current scene and data; a request for
  another address is forbidden.
- **AT-S05:** Given a stale `display.state`, when received, then it cannot lower
  hub state or assignment revision.

---

## Edge Cases & Error Handling

- **Concurrent applies:** Serialize the full read/check/write operation in the
  shared hub command queue so saved versions and revisions remain monotonic.
  Multiple writers and direct database edits are unsupported.
- **Online notification fails after persistence:** Return saved IDs, close or
  resync the session, and let resume replay database truth.
- **No assignment on resume:** Send `session.ready` without manufacturing a
  scene; return `NOT_FOUND` to explicit resync.
- **Canonical equality:** Compare validated normalized values with stable key
  order, not source whitespace or unknown stripped fields.

---

## Security Considerations

- **Authentication and authorization:** Assign only to an existing exact token
  grant; sessions can request only their authenticated address.
- **Input validation:** CLI and hub both use the strict shared scene schema.
- **Sensitive data exposure:** Scene JSON cannot contain credentials or URLs;
  database/control errors omit SQL and environment data.
- **Audit logging:** Record scene/version/assignment IDs, target address and
  no-op/change outcome.
