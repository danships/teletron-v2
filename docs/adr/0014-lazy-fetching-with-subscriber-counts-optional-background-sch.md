# ADR-014: Lazy fetching with subscriber counts, optional background schedules

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), sections 1, 6

## Context

Data that nobody sees must not cost requests or rate limits.

## Decision

The hub keeps a subscriber count for each source. It fetches a source only while a visible scene uses it. A pull source declares a refresh interval and a cache time. A source can declare an optional background schedule, for example daily, mainly for history.

## Consequences

- No fetches for data that nobody sees.
- Scene switches and overlays show the last cached value immediately.
