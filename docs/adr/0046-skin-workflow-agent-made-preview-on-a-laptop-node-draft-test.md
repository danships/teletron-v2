# ADR-046: Skin workflow: agent-made, preview on a laptop node, draft, test-push, publish

- Status: Accepted
- Date: 2026-11-09
- Deciders: Dan
- Source: [characters.md](../characters.md), section 4

## Context

Agents make skins on request. Mistakes in a skin must not reach all displays at once.

## Decision

Agents create skins through MCP. A laptop node has a preview mode that cycles through all states, moods and props. The lifecycle is draft, then test-push to one display, then publish. Each step is a version with rollback (ADR-034).

## Consequences

- The skin format must stay simple for agents.
- The MCP control plane needs draft, test-push and publish operations for skins.
