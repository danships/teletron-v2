# ADR-057: Fit Slice 1 persistence to SuperSave documents

- Status: Proposed
- Date: 2026-11-10
- Deciders: Dan
- Direction: Dan requested simpler specs using existing SuperSave capabilities.

## Context

PR #4 stopped because the approved plan prescribed normalized SQL tables,
constraints and multi-record transactions that SuperSave does not expose.
Updating the dependency to the latest published beta, `1.0.0-beta4`, does not
supply those features. The published MySQL implementation uses `id`/`contents`
documents, generated filter columns, `VARCHAR(32)` storage IDs and pool-backed
repositories without public transaction or row-lock APIs.

Those SQL mechanisms are more restrictive than this single-hub home deployment
needs. Dan explicitly chose to adapt Teletron rather than extend SuperSave.

## Options considered

- Extend SuperSave with relational schemas and transaction-bound repositories:
  rejected for this slice; these requirements do not belong upstream.
- Add custom SQL repositories: unnecessary second data-access approach and a
  departure from ADR-004.
- Use SuperSave documents and single-writer application checks: selected; aligns
  with ADR-001, ADR-004 and ADR-040, with explicit concurrency/crash limits.

## Decision

Use SuperSave's existing repository API and native storage layout. Keep the beta
pinned and install its optional `mysql2` driver directly in the hub.

- Store each node and its token history in one document. Creation, revocation
  and replacement issuance each use a single document write; there is no
  separate token entity or cross-document credential transaction.
- Keep the protocol's public UUID as document data (`node_id`), separate from
  SuperSave's opaque storage ID. Do not change protocol UUID schemas.
- Run all mutations through one async queue in the sole live hub. Validate
  names, hash uniqueness, active-token state and references inside that queue.
  CLI clients never open the database. Multiple hub writers are unsupported.
- Allow repository scans for token hashes at this scale. Reject ambiguous or
  malformed authentication records, revoked tokens and malformed grants.
- For PR8, store immutable scene versions inside their scene document and
  assignments inside node documents. Save the version before the assignment;
  publish only after assignment persistence. A crash may leave an unassigned
  version, which is safe to reuse on retry or prune under normal retention rules.
- Check references in application operations and prune after assignment writes,
  within the same queue. Do not expose node/scene deletion in this slice.

No custom SQL migrations, database uniqueness/foreign-key constraints, row locks
or cross-document rollback are required. SuperSave initializes the entities;
future document changes require a compatibility plan. Application tests cover
observable behavior through the hub boundary rather than relational DDL.

## Consequences

- PR #4 can proceed against the installed beta without changing SuperSave.
- Single-document credential writes avoid partially created node/token pairs.
- Application checks cannot protect against external writers or manual edits.
  This limitation is accepted for Slice 1, not a claim of database enforcement.
- Scene apply is ordered and retryable, not atomic across documents. Unassigned
  saved versions and uncertain write outcomes must be handled explicitly.
- Hash-only storage, public UUID identity, strict grants, revocation, immutable
  historical versions and ADR-034 retention remain required.
- The parent spec, PR4/5/8 plans and database skill describe this narrower model.
  This ADR remains Proposed for review; no persistence implementation or schema
  edits are part of this documentation change.
