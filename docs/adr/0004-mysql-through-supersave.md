# ADR-004: MySQL through supersave

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), sections 2, 16

## Context

The hub needs a persistent store. supersave is Dan's own data library.

## Decision

Use MySQL through supersave for all hub data.

## Consequences

- Data access follows supersave patterns.
- The database schema is a protected path (ADR-041).
