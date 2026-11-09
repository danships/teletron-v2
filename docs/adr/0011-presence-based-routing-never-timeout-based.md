# ADR-011: Presence-based routing, never timeout-based

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), sections 1, 12

## Context

Waits on dead endpoints make the system slow and hard to reason about.

## Decision

The hub always knows which nodes are online. Routing uses presence only. No request waits on a timeout for a dead endpoint.

## Consequences

- Calls fail fast when no provider is online.
- The hub must track connection state correctly.
