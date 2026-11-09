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

### `scenes`

Stable scene identity with UUID `id`, unique `name` and UTC `created_at`.

### `scene_versions`

Immutable versions with UUID `id`, `scene_id` foreign key, positive `version`,
validated JSON `spec`, UTC `created_at` and unique `(scene_id, version)`.

### `scene_assignments`

Current direct assignment with `node_id`, capability `instance`,
`scene_version_id`, positive monotonic `revision` and UTC `updated_at`; primary
key `(node_id, instance)`.

**Relationships**

- `scene_versions.scene_id` → `scenes.id` — many versions to one scene; restrict
  deletion.
- `scene_assignments.node_id` → `nodes.id` — many assignments to one node;
  restrict deletion.
- `scene_assignments.scene_version_id` → `scene_versions.id` — many assignments
  to one immutable version; restrict deletion.

**Migration strategy**

- Additive migration. Scene apply commits version and assignment together.
  Rollback does not destroy authored versions.

---

## Implementation Steps

### Database

1. [ ] Obtain approval before changing protected `apps/hub/src/db/schema/`.
2. [ ] Write failing AT-D05 through AT-D11 database tests before schema and
       repository code, including concurrent revision and retention fixtures.
3. [ ] Add the three schema definitions/migration and
       `apps/hub/src/scenes/scene-repository.ts` for lookup, immutable version
       creation, assignment and current-state reads.
4. [ ] Implement `applyScene` as one transaction: parse through the shared scene
       schema, verify node and exact granted `display:web` instance, verify target,
       compare canonical parsed JSON, create the next version only on a semantic
       change, and increment the display assignment revision.
5. [ ] After a real update in the same transaction, prune only unassigned
       versions older than 30 days and outside the newest 20 for that scene.

### Backend

1. [ ] Write AT-S01 through AT-S05 as failing WebSocket/control integration
       tests before adding scene dispatch.
2. [ ] Extend PR5 control schemas/client/CLI with one `scene.apply` command that
       accepts a local JSON file, scene name, node name and instance. Validate in
       the CLI and again in the live hub; never let the client write the DB.
3. [ ] Add `apps/hub/src/scenes/scene-service.ts` to call the transaction, obtain
       current module snapshots from an injected provider (empty until PR10),
       and notify only the current authenticated matching display after commit.
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

- **AT-D05:** Given an empty database, when the scene migration runs, then scene,
  version and assignment tables match this spec.
- **AT-D06:** Given a new valid scene, when applied, then immutable version 1 and
  an assignment revision are committed together.
- **AT-D07:** Given an updated valid scene, when applied, then a new immutable
  version and higher assignment revision are created without modifying the
  earlier version.
- **AT-D08:** Given invalid scene JSON, an unknown node, an ungranted display
  instance or a target mismatch, when apply runs, then nothing is written.
- **AT-D09:** Given an attempted delete of a referenced node or scene version,
  when executed, then foreign-key restrictions reject it.
- **AT-D10:** Given more than 20 scene versions across more than 30 days, when
  another version is applied, then only unassigned versions outside both
  retention windows are pruned and all assigned versions remain.
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

- **Concurrent applies:** Lock the assignment/scene version sequence so committed
  versions and assignment revisions remain strictly monotonic.
- **Online notification fails after commit:** Return committed IDs, close or
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
