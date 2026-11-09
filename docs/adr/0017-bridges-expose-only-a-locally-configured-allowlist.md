# ADR-017: Bridges expose only a locally configured allowlist

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), sections 6, 15

## Context

A compromised hub must not get access to everything in the home.

## Decision

A bridge node exposes only the items in its local allowlist. It does not announce, stream or execute anything else.

## Consequences

- Dan controls exposure on the node.
- The boundary holds even if the hub is compromised.
