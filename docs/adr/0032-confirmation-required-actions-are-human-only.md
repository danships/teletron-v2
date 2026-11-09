# ADR-032: Confirmation-required actions are human-only

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), sections 10, 15

## Context

Agents and rules can act without a person present.

## Decision

Agents (MCP) and event rules cannot trigger actions that require confirmation. Only a person at a client can start and confirm them.

## Consequences

- Safe default.
- Deferred: if agents may ever trigger these actions. The default is no.
