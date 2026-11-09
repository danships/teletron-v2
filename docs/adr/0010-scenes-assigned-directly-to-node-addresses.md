# ADR-010: Scenes assigned directly to node addresses

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 4

## Context

A logical display layer adds indirection. Logical node identity (ADR-008) already covers hardware moves.

## Decision

Assign scenes directly to node addresses. Do not add a logical display layer now.

## Consequences

- The model stays simple.
- Revisit when a concrete need for logical displays exists.
