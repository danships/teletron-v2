# ADR-034: Versioning of specs, scenes and rules with rollback

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 11

## Context

Agents will make mistakes. History must not grow forever.

## Decision

Every change to a spec, scene or rule is a new version tagged with the agent. Keep the last 20 versions or 30 days, whichever keeps more. Rollback is easy. MCP has a validate and preview tool. Specs reference credentials by name and never embed them.

## Consequences

- Agent mistakes are recoverable.
- Agents can check a spec before it goes live.
