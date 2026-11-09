# ADR-048: Pet events in the event bus with slow escalation and a ceiling

- Status: Accepted
- Date: 2026-11-09
- Deciders: Dan
- Source: [characters.md](../characters.md), section 5.3, and [architecture.md](../architecture.md), section 9
- Note on: ADR-029, ADR-030

## Context

The pet must ask for attention without disturbing important alerts.

## Decision

The pet sends generic events, for example `pet.needs-attention`, with the category `pet`. A display configuration lists the event categories it accepts. Rules use this list when they target displays. There is no separate subscription mechanism. Pet events start at a low priority. While they are ignored, the priority goes up slowly, to a ceiling below important events.

## Consequences

- ADR-030 stays. Event categories are an extra filter on rule targets.
- ADR-029 gets one addition: an overlay priority can go up over time, but never above its ceiling.
