# ADR-020: Hub offline: cached scene, offline indicator, local modules continue

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), sections 3, 7

## Context

The hub restarts and can fail. Screens must stay useful.

## Decision

When the hub is offline, a node continues to show its cached scene with an offline indicator. Locally computed modules (clock, countdowns, animations) continue to run. Nodes do not dim stale data.

## Consequences

- Modules must declare if they are local-only, data-driven or mixed.
