# ADR-024: Declarative animation and sprites rendered by nodes

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 7

## Context

Pixel displays need motion. Streamed frames cost bandwidth.

## Decision

Animation is declarative: scroll, blink, fade, slide, scene transitions and sprite sheets. Nodes run their own render loop.

## Consequences

- Rich pixel output at no bandwidth cost.
- Sprite sheets are the base for the pet.
