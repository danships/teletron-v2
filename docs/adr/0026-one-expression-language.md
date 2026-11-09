# ADR-026: One expression language

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 7 and 17

## Context

Transforms, conditions and dynamic durations all need expressions.

## Decision

Use one expression language, for example JSONata, for transforms, conditions and dynamic durations. Choose the language in the slice that needs it first.

## Consequences

- One thing to learn, to validate and to give to agents.
