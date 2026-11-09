# ADR-030: Rules target displays by address, tags, or both

- Status: Accepted, amended by ADR-048
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 9

## Context

New displays must join rules without manual changes.

## Decision

Rules target displays by address, by tags, or both. The hub skips a display without a matching layout and logs a warning.

## Consequences

- New displays join automatically through tags.
- One bad target does not fail a rule.

## Amendments

- ADR-048: a display lists the event categories it accepts. Rules use this list as an extra filter.
