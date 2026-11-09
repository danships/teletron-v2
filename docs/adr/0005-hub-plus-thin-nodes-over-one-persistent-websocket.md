# ADR-005: Hub plus thin nodes over one persistent WebSocket

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), sections 1, 2

## Context

The system has many devices with different capabilities. The decisions must stay in one place.

## Decision

Nodes are thin clients. Each node dials out to the hub over one persistent WebSocket connection. The hub decides. Nodes render, speak, listen and bridge.

## Consequences

- Nodes do not need open ports.
- All traffic uses one message envelope: manifests, subscriptions, scene assignments, data updates, input events, capability calls and confirmations.
- After a reconnect or a hub restart, the hub restores the current state and in-flight calls.
