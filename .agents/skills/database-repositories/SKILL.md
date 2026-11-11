---
name: database-repositories
description: Use when adding or changing Teletron hub persistence with SuperSave and MySQL. Covers ownership, protected schema changes, repository usage, security invariants, and test expectations; do not use for in-memory state that the approved slice does not persist.
---

# Teletron database repositories

The hub is Teletron's source of truth. Persistent state uses MySQL through SuperSave as decided by
ADR-004; do not use SuperSave's optional HTTP API or introduce a second persistence layer.

## Before changing persistence

1. Read the current roadmap slice, its approved spec, and the applicable ADRs.
2. Stop if the spec is not approved or does not define the proposed table or persistence change.
3. Changes to protected `apps/hub/src/db/schema/` covered by the approved spec or plan are
   authorized. Do not ask Dan for additional approval; follow `AGENTS.md`.
4. Write the spec's acceptance tests first. Do not weaken, skip, or remove them.

## Boundaries

- Keep schema and repository access in the hub database layer; keep orchestration in the hub
  feature that owns it.
- Do not put hub business logic into a reusable package merely because it uses the database.
- Packages never import apps, and apps never import other apps.
- Read `DATABASE_URL` through validated hub configuration. Never embed credentials in source,
  fixtures, logs, errors, specs, or protocol messages.
- For Slice 1, follow the document model in Spec 001 and proposed ADR-057: embed token history in
  nodes, versions in scenes and assignments in nodes. Public node UUIDs are separate from opaque
  SuperSave storage IDs. No SQL constraints, row locks or upstream transaction extensions are required.
- Route all mutations through the sole live hub's async command queue; run application uniqueness,
  reference and active-token checks inside it. Multiple hub writers and direct CLI database writes
  are unsupported. A queue does not provide cross-process locking or cross-document rollback.
- Save credentials with one document write. Save scene versions before assignments; publish only
  after assignment persistence. Handle uncertain writes by rereading, reuse unassigned matching
  versions on retry, and prune only after rechecking references inside the queue.

## SuperSave repository pattern

Use the repository API exposed by the installed SuperSave version rather than raw SQL for normal
entity access. The common operations are:

```typescript
const rows = await repository.getByQuery(query);
const row = await repository.getOneByQuery(query);
const created = await repository.create(input);
const updated = await repository.update({ ...existing, changedField });
await repository.deleteUsingId(existing.id); // Only where the spec permits deletion.
```

Build queries from `repository.createQuery()` and keep query construction close to the repository
boundary. Confirm exact method signatures from the installed dependency's types; do not copy
source-project entity names, helpers, imports, or migration layout into Teletron.

## Teletron security invariants

- Store node and agent tokens only as hashes. Return a newly issued token once and never log it.
- Authentication failures must not reveal whether a node ID, name, or token was wrong.
- Keep capability grants separate from node-provided manifests; a manifest cannot elevate grants.
- Use stable database identity separately from versioned declarative JSON where the spec requires
  rollback or history.
- Treat destructive maintenance as idempotent and revalidate targets immediately before deletion.

## Tests and handoff

Cover successful writes/readback, missing or malformed records, application uniqueness/reference
checks, overlapping commands through one hub, interrupted writes/retries, and every affected security
invariant. For Slice 1, test its documented document-write guarantees instead of SQL constraints or
transaction rollback. Use isolated test data and never point tests at
a non-test database. Finish with `pnpm check`.
