# ADR-009: Everything a node offers is an addressable capability instance

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), sections 1, 4

## Context

Nodes offer screens, inputs, voice, LLMs and bridges. Separate models for each type add complexity.

## Decision

Each thing a node offers is an addressable capability instance, for example `livingroom-pi/hdmi` and `livingroom-pi/matrix`. Bridging, for example Bluetooth, is internal to the node.

## Consequences

- One model and one routing path for all capability types.
