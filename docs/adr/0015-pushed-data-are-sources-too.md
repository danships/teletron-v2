# ADR-015: Pushed data are sources too

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 6

## Context

Data also arrives from nodes and webhooks, not only from polling.

## Decision

Values pushed by nodes or webhooks are sources. Webhook endpoints created on the hub are sources and also fire events.

## Consequences

- Scenes, conditions and rules use one model for polled and pushed data.
