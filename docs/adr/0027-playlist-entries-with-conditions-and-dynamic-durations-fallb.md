# ADR-027: Playlist entries with conditions and dynamic durations, fallback scene required

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 8

## Context

Displays must show only relevant content and never go blank.

## Decision

Each display has playlists. An entry has a duration and an optional condition. The duration is fixed, an expression, or a "done" signal from the module (for example scroll once), bounded by a minimum and a maximum. Conditions read only cached data and never trigger fetches. Each display must have a fallback scene, for example a clock.

## Consequences

- A display never shows a blank screen.
- Conditions cannot cause fetch storms.
