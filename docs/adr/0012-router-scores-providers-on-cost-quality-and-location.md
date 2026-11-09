# ADR-012: Router scores providers on cost, quality and location

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 12

## Context

Some capabilities have more than one provider, for example a local GPU and a cloud API.

## Decision

Providers declare cost, quality tier and location in their manifest. The router removes offline and unsuitable providers, scores the remaining providers and uses Dan's priority as tiebreaker. A request can give hints: prefer quality, cost or local. Hard requirements, for example "must be local", fail immediately when no provider matches.

## Consequences

- The free local GPU wins when it is online. The cloud takes over immediately when it disconnects.
- Build the router only when a second provider exists (principle: simplicity first).
