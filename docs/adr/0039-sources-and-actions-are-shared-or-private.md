# ADR-039: Sources and actions are shared or private

- Status: Accepted, amended by ADR-050
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), sections 6, 10, 14

## Context

Personal data must stay personal, but can be useful on shared screens.

## Decision

Each source and action is shared or private to one or more people. A session accesses only what the speaker may use. A private source can appear on any screen, also a shared screen, but only its owner, or an agent that acts for the owner, can put it there.

## Consequences

- The owner decides where personal data appears.

## Amendments

- ADR-050: there is no privacy separation between household members on shared screens. Private sources and actions still control what an agent or session can use and place.
