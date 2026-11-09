# ADR-021: Fixed component library, no HTML or arbitrary code

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), sections 1, 7

## Context

Agents write modules. Free-form HTML or code is unsafe and hard to validate.

## Decision

Modules use a fixed component library: big number, text, chart, image, icon, sprite and layouts. Do not allow HTML or arbitrary code. Revisit for specific cases only.

## Consequences

- Specs are safe, can be validated and are easy for agents to get right.
- New visual types need a new component.
