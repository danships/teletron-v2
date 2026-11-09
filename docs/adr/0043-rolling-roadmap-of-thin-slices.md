# ADR-043: Rolling roadmap of thin slices

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [roadmap.md](../roadmap.md)

## Context

Teletron grows feature by feature on a working system.

## Decision

Work in thin slices. Each slice ends with something visible on the wall. Order: (1) hub, one Pi web display node, clock, weather and YouTube followers, one scene per display; (2) scheduling; (3) MCP control plane; (4) events, webhooks, rules and overlays; (5) pixel display, animation, assets; (6) agent-defined pull sources, history rollups; (7) bridge nodes and actions with confirmation; (8) capability registry and router; (9) assistants; (10) later items.

## Consequences

- The envelope and module spec are designed properly in slice 1.
- The current order and status are in docs/roadmap.md.
