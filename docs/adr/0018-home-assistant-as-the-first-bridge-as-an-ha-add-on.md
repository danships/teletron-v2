# ADR-018: Home Assistant as the first bridge, as an HA add-on

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 6

## Context

Home Assistant already runs in the home and holds most device data.

## Decision

Implement the first bridge as a Home Assistant add-on (a container) that reuses the TypeScript node code.

## Consequences

- No extra hardware is necessary.
