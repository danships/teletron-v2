# ADR-002: Central hub on a 24/7 VPS

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), sections 2, 3

## Context

State and decisions need one home that is always online.

## Decision

Run one hub service with one database on a VPS that operates 24/7. The hub owns config, specs, credentials, assets, history, the scheduler, priority stacks, the rules engine, the event bus, the router, the MCP server, people and assistant memory.

## Consequences

- There is one service and one database to operate.
- The hub is a single point of failure. ADR-020 defines what nodes do when the hub is offline.
