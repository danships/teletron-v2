# ADR-041: Guardrails for AI-written code

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [AGENTS.md](../../AGENTS.md)

## Context

Agents write most code with limited supervision. Complexity must be visible and expensive.

## Decision

Each slice starts with a short plan (files touched, new concepts, tables, protocol messages, dependencies, non-goals) that Dan approves before coding. Each slice has a spec with explicit non-goals. Acceptance tests come from the spec, and the implementing agent must not weaken them. Protected paths (protocol types, database schema, specs, AGENTS.md) need Dan's approval. CI enforces strict TypeScript, linting, maximum file and function length, cyclomatic complexity, dependency-cruiser boundaries and a PR size cap. Every few slices, a simplification pass deletes and simplifies only, with no features.

## Consequences

- Implemented in this repo: AGENTS.md, CODEOWNERS, eslint.config.mjs budgets, .dependency-cruiser.cjs, scripts/check-pr-size.sh, docs/specs/.
