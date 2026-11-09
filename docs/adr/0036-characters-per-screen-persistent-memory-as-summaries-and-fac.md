# ADR-036: Characters per screen, persistent memory as summaries and facts

- Status: Accepted, amended by ADR-044
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 13

## Context

Screens can have different personalities. Full transcripts are large and sensitive.

## Decision

Different screens can have different characters, each with its own personality. A character is shared or owned by one person. Persistent memory lives on the hub as summaries and facts, not full transcripts, with retention rules and a way to view and delete it.

## Consequences

- Personalization across nodes without full transcripts.

## Amendments

- ADR-044: an assistant and its pet can share one screen.
