# ADR-033: One MCP token per agent, scoped permissions later

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 11

## Context

Many agents, interactive and autonomous, will change the system.

## Decision

Give each agent its own token. Add scoped permissions later, only if needed.

## Consequences

- Logs show which agent made a change.
- Revocation is per agent, without a permission model.
