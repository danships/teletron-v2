# ADR-003: TypeScript for the hub and Node-capable nodes, C++ for a future ESP32

- Status: Accepted, amended by ADR-051
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 2

## Context

Most parts of the system run on hardware that can run Node.js.

## Decision

Write the hub and all Node-capable nodes in TypeScript. Use C++ only for future ESP32 clients.

## Consequences

- One language covers most of the system.
- Node code is reused, for example in the Home Assistant add-on (ADR-018).
- An ESP32 client needs its own protocol implementation.

## Amendments

- ADR-051: there is no ESP32 and no C++ code. All code is TypeScript.
