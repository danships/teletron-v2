# ADR-028: Named schedules by time range and weekday first

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 8

## Context

The content of a display changes with the time of day.

## Decision

Named schedules (for example morning, workday, evening) use time ranges and weekdays. They map to playlists for each display. Conditional schedules, for example sunset or someone at home, come later.

## Consequences

- Covers the main need with minimum complexity.
