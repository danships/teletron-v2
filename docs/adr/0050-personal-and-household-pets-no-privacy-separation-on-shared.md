# ADR-050: Personal and household pets, no privacy separation on shared screens

- Status: Accepted
- Date: 2026-11-09
- Deciders: Dan
- Source: [characters.md](../characters.md), section 7
- Amends: ADR-039

## Context

More than one person uses the same screens. ADR-039 lets only the owner put a private source on a screen.

## Decision

A personal pet has one shared core (life, needs) plus a layer for each person (looks, behaviour, memories, interactions). A household pet has shared experiences only. This is a setting for each pet. There is no privacy separation between household members on shared screens.

## Consequences

- Private sources and actions still control what an agent or session can use and place (ADR-039).
- Content on a shared screen, including a personal pet layer, is visible to all household members.
