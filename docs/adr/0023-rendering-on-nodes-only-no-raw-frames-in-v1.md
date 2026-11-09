# ADR-023: Rendering on nodes only, no raw frames in v1

- Status: Accepted, amended by ADR-051
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), sections 5, 7

## Context

The first display node is a Pi. The hub must stay light.

## Decision

The hub sends layouts and data only. Each display node renders itself. One TypeScript pixel renderer serves capable nodes. Dumb clients, for example a bare ESP32, come later, probably through a nearby Pi as renderer.

## Consequences

- The hub stays light.
- This replaces the earlier raw RGB frame decision for v1.

## Amendments

- ADR-051: there are no dumb clients. The Pi renders GIF loops for the iPixel Color panel.
