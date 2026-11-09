# S1-PR10 — Run pull sources only for visible subscribers

- Parent spec: [Spec 001](../001-hub-and-first-display.md)
- Slice PR: 10
- Ticket type: Story

## Overview

Add the hub-owned lifecycle for built-in pull sources: subscriber accounting,
fresh cache reuse, single-flight refresh, safe failure behavior and full data
fan-out to every visible module instance. Provider-specific HTTP adapters remain
for PR11 and PR12.

---

## Implementation Steps

### Backend

1. [ ] Write AT-SR01 through AT-SR09 with fake adapters, fake timers and fake
       ready display sessions before lifecycle code.
2. [ ] Add `apps/hub/src/sources/source-types.ts` with Teletron-owned types for a
       built-in source definition, mapped JSON-object value, refresh/cache
       durations and credential-free failure category. Keep adapter interfaces
       internal to the hub.
3. [ ] Add `apps/hub/src/sources/source-cache.ts` keyed by source ID. Track last
       successful value, generation/sequence data revision, retrieval/freshness
       timestamps, one in-flight generation and next refresh timer in memory.
4. [ ] Add `apps/hub/src/sources/source-subscriptions.ts` to derive source usage
       from each connected ready display's current assigned scene. Count one
       subscriber per display/source pair while retaining all bound module IDs.
       Reconcile on ready, scene assignment/change and session cleanup.
5. [ ] Add `apps/hub/src/sources/source-runner.ts`. On first subscriber, emit a
       fresh cache immediately or start one fetch; schedule from completion at
       the definition interval; abort/retire work at zero subscribers; permit at
       most one active fetch and enforce a 10-second timeout.
6. [ ] Give every fetch an opaque run ID. Apply a result only if its run is still
       current, so cancelled or superseded promises cannot overwrite cache.
7. [ ] Compare validated mapped values before emission. Increment the current
       hub generation's sequence only for an emitted full replacement; fan one
       `display.data.update` per bound module with its current scene revision.
8. [ ] On failure with cache, retain and emit nothing while recording a safe
       error. On initial failure, emit the source's explicit unavailable object
       so every bound module renders its placeholder, then retry next interval.
9. [ ] Expose current snapshots to PR8's resume/resync provider and make PR6
       close cleanup synchronously remove subscription counts/timers.
10. [ ] Run fake source tests and all session/scene regressions, then
        `pnpm check`.

---

## Acceptance Tests Covered

- **AT-SR01:** Given zero source subscribers, when time advances, then no adapter
  fetch occurs.
- **AT-SR02:** Given the first ready display subscriber, when it appears, then one
  immediate fetch starts; further subscribers share it.
- **AT-SR03:** Given all subscribing displays disconnect or change scene, when
  counts reach zero, then scheduled fetches stop.
- **AT-SR04:** Given a fresh cached value when a subscriber appears, then it is
  sent immediately without another fetch until refresh is due.
- **AT-SR05:** Given a successful refresh, when mapped data differs or is
  unchanged, then data revisions increase only for an emitted full replacement
  and all subscribed module instances receive it.
- **AT-SR06:** Given a fetch failure after a cached success, when handled, then
  the prior value remains, no dim/blank update is sent and a credential-free
  error is recorded.
- **AT-SR07:** Given an initial fetch failure with no cache, when handled, then
  the affected module receives/shows unavailable state and retries at the next
  interval.
- **AT-SR08:** Given a scene with two modules bound to one source, when it becomes
  visible, then that display contributes one source subscriber while both module
  instances receive mapped updates.
- **AT-SR09:** Given a stale result from a cancelled or superseded fetch, when it
  resolves, then it cannot overwrite the newer cache value.

---

## Edge Cases & Error Handling

- **Subscriber leaves during fetch:** Abort when possible and always retire its
  run ID; no result applies without current subscribers.
- **Subscriber arrives during a fresh cache:** Emit current snapshot to only the
  new display/modules without advancing data revision.
- **Hub generation change:** Create one UUID at process start and start sequence
  numbering fresh; persisted nodes use welcome generation semantics from PR7.
- **Adapter throws non-Error data:** Normalize to a fixed safe source failure and
  never stringify arbitrary thrown values into logs.

---

## Security Considerations

- **Authentication and authorization:** Fan-out targets only current ready
  sessions authenticated for the exact display address.
- **Input validation:** Adapter outputs must be validated/mapped before entering
  cache or protocol state.
- **Sensitive data exposure:** Failure records contain source ID/category and
  timing, never URL query strings, headers, bodies or credentials.
- **Audit logging:** Record subscriber transitions, refresh outcome and safe
  failure category; avoid logging data values by default.
