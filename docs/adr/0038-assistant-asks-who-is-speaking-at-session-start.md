# ADR-038: Assistant asks who is speaking at session start

- Status: Superseded by ADR-049
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 14

## Context

The assistant must know the person to apply memory and permissions.

## Decision

The assistant asks who is speaking at the start of a session. Device ownership and voice recognition come later.

## Consequences

- Simplest identification that works.

## Amendments

- ADR-049: identity is set explicitly on each display, with a default identity.
