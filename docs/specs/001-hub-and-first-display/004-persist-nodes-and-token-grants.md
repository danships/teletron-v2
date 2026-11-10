# S1-PR4 — Persist nodes and token grants

- Parent spec: [Spec 001](../001-hub-and-first-display.md)
- Slice PR: 4
- Ticket type: Story

## Overview

Add the hub persistence boundary using SuperSave's existing document repositories
on MySQL. Store a node and its token history together so each credential change
needs one document write. No CLI, control socket or WebSocket behavior belongs
in this PR. See [ADR-057](../../adr/0057-supersave-beta-and-persistence-compatibility.md).

## Tech Stack

- `supersave@1.0.0-beta4` — current pinned beta, ADR-004 repository boundary.
- `mysql2` — SuperSave's optional MySQL driver peer, installed directly in the hub.

Install with pnpm and `--ignore-scripts`, preserving release-age controls. State
both dependency reasons in the PR description. No upstream extensions or custom
SQL persistence layer are required.

## Data Model

One SuperSave entity, `nodes`, stored using its native `id`/`contents` format.
Field types below describe validated document data, not SQL column definitions.

| Field        | Type                 | Notes                                                                |
| ------------ | -------------------- | -------------------------------------------------------------------- |
| `id`         | SuperSave storage ID | Opaque internal repository key                                       |
| `node_id`    | UUID string          | Application-generated public identity, used by the existing protocol |
| `name`       | string               | Immutable, validated logical name, unique through the hub            |
| `created_at` | UTC timestamp string | Required                                                             |
| `tokens`     | token record array   | Required; at most one active token                                   |

Each embedded token has an application-generated UUID `id`, SHA-256 `token_hash`,
strictly validated `grants`, UTC `created_at` and nullable UTC `revoked_at`.
There is no separate `node_tokens` entity or foreign key. Tokens remain associated
with their node by containment. The SuperSave storage ID is never used as a wire
node ID; no protocol or UUID schema changes are needed.

Declare `node_id` and `name` as filter/sort fields where useful. Initial setup
registers the entity through SuperSave; there are no hand-written SQL migrations,
unique constraints, foreign keys or row locks. Future document-shape changes
require an explicit compatibility plan before deployment.

## Implementation Steps

1. [ ] Obtain approval before changing protected `apps/hub/src/db/schema/`.
2. [ ] Add an integration harness requiring an explicit test `DATABASE_URL`.
       Create a fresh isolated test database, initialize SuperSave entities and
       clean only that database. SQL is allowed for harness database lifecycle,
       not application entity access.
3. [ ] Write failing AT-D01 through AT-D04 tests before entity/repository code.
       Include independent concurrent calls through the same hub boundary and
       restart/readback tests against MySQL.
4. [ ] Parse database configuration in `apps/hub/src/config/database.ts` and
       reject absent/non-MySQL URLs without exposing credentials.
5. [ ] Add the SuperSave factory in `apps/hub/src/db/database.ts` and entity
       definition under `apps/hub/src/db/schema/`. Disable optional HTTP APIs.
6. [ ] Add `apps/hub/src/nodes/node-repository.ts`: create a node with its first
       token in one `create()`, load by token hash, revoke by token ID and issue a
       replacement by updating the complete existing node document.
7. [ ] Use one hub-owned async command queue for all persistence mutations.
       Perform duplicate-name/hash and active-token checks inside that queue,
       rereading stored state before writing. A failed command must not poison
       the queue. No other process or code path may write the database.
8. [ ] Validate records before writes and after reads. Parse each token's grants
       through `tokenGrantSchema`. Malformed records or ambiguous hash matches
       fail authentication closed. Do not default missing grants to an empty set.
9. [ ] For this small home deployment, token lookup and cross-node hash checks
       may scan node documents through SuperSave. Do not add a persistent index
       or cache until a concrete need appears.
10. [ ] Keep hashing/random token generation outside this boundary; PR5 owns
        one-time plaintext handling. Export composition without a listener, then
        run MySQL integration tests and `pnpm check`.

## Acceptance Tests Covered

- **AT-D01:** Given an empty isolated MySQL database, when SuperSave initializes
  and a node is created, then the node and embedded token survive reconnect and
  retain the public UUID, immutable name, timestamps, hash and exact grants.
- **AT-D02:** Given duplicate names or token hashes, when hub repository commands
  run, including overlapping calls, then one succeeds and duplicates are rejected
  without extra documents or tokens. This tests the hub boundary, not direct SQL.
- **AT-D03:** Given malformed stored records or grants, duplicate token-hash
  matches, or a revoked token, then lookup fails closed before authentication.
- **AT-D04:** Given an active token, another issuance is rejected without a write.
  After revocation, overlapping replacement requests through one hub produce one
  new active token and preserve identity/history. A failure before the write
  leaves the stored document unchanged and does not block subsequent commands.

## Edge Cases & Error Handling

- **Concurrency:** One live hub process is the sole writer. Its queue covers the
  complete read/check/write operation. Multiple writers and external database
  edits are unsupported; a queue is not a cross-process database lock.
- **Write failure:** Do not publish success or update an in-memory credential
  view before a write succeeds. A connection failure after a possible commit has
  an uncertain outcome: return a safe failure and reread storage before retrying.
- **Process crash:** Node and first token cannot be split across writes. A saved
  token whose response was lost must be revoked before replacement (PR5).
- **Malformed storage:** Return a typed closed failure; diagnostics contain row
  IDs only. No SQL, connection data, hashes or grant payloads in errors.
- **Database unavailable:** Fail composition before any listener starts.

## Security Considerations

Only token hashes are persisted. Shared name/grant schemas protect the boundary;
manifests cannot grant permissions. Authentication failures reveal no credential
detail. Node/token deletion and direct database administration are outside this
slice. Repository outcomes expose only IDs and safe statuses for later auditing.
