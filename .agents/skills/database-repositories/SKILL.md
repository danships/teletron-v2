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
3. Ask Dan before changing `apps/hub/src/db/schema/`; it is a protected path even when a spec
   already names the table.
4. Write the spec's acceptance tests first. Do not weaken, skip, or remove them.

## Boundaries

- Keep schema and repository access in the hub database layer; keep orchestration in the hub
  feature that owns it.
- Do not put hub business logic into a reusable package merely because it uses the database.
- Packages never import apps, and apps never import other apps.
- Read `DATABASE_URL` through validated hub configuration. Never embed credentials in source,
  fixtures, logs, errors, specs, or protocol messages.
- Use transactions for operations whose invariants span multiple writes.

## SuperSave repository pattern

Use the repository API exposed by the installed SuperSave version rather than raw SQL for normal
entity access. The common operations are:

```typescript
const rows = await repository.getByQuery(query);
const row = await repository.getOneByQuery(query);
const created = await repository.create(input);
const updated = await repository.update({ ...existing, changedField });
await repository.delete(existing.id);
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

Cover successful writes, missing rows, uniqueness and foreign-key constraints, transaction rollback,
and every security invariant affected by the change. Use isolated test data and never point tests at
a non-test database. Finish with `pnpm check`.
