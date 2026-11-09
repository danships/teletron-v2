# ADR-019: Short raw history plus hourly and daily rollups

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 3

## Context

The latest value matters most. Trends and sparklines need some history.

## Decision

Keep raw values for approximately 48 hours. Then roll them up to hourly and daily aggregates (min, max, avg, last). Each source declares if it keeps history and how to aggregate. A nightly job does the rollups, version cleanup and asset garbage collection.

## Consequences

- Sparklines and trends are cheap.
- Raw values older than 48 hours are not available.
