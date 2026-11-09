# ADR-022: Separate layouts per target type, shared data bindings

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 7

## Context

Pixel art on a 64x128 matrix needs layouts tuned by hand. A web layout does not scale down.

## Decision

A module has a separate layout for each target type (web, pixel). The layouts share data bindings. A module can support one target only. Placing a module on an unsupported target is a clear error.

## Consequences

- Each target looks good.
- A module for two targets needs two layouts.
