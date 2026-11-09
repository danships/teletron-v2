# ADR-001: Home project scope, not production grade

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 1

## Context

Teletron is a personal home platform. It does not serve external users, but it must grow for years.

## Decision

Treat Teletron as a home project, not a production system. Use the simplest thing that works today. Do not block the future.

## Consequences

- High availability, audits and formal operations are out of scope.
- Code quality and structure stay high, because the code must live for years.
- Shortcuts are allowed, but agents must name them in the PR.
