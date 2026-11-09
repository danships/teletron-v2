# ADR-025: Assets on the hub, content-hash addressed, agent-uploadable, SVGs sanitized

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), sections 7, 15

## Context

Agents must be able to add images safely. Nodes must work offline.

## Decision

Store assets on the hub, addressed by content hash. Nodes cache them. Agents can upload SVGs and images through MCP. The hub sanitizes SVGs: it removes scripts, external references and event handlers. Pixel nodes rasterize assets to their resolution.

## Consequences

- Agents can enrich content safely.
- Nodes show cached assets offline.
