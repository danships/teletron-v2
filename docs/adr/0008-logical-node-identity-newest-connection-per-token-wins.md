# ADR-008: Logical node identity, newest connection per token wins

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 4

## Context

Hardware breaks or gets replaced. Scenes must not need changes when that happens.

## Decision

A node is a name, not hardware. The same token on new hardware takes over the node with its scenes. Only one connection per token is active: the newest connection wins, the hub disconnects the old connection and logs the takeover.

## Consequences

- Hardware swaps are painless.
- Two devices with the same token disconnect each other. The takeover log shows this.
