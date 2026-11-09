# ADR-047: Pet time model: compressed day, slow needs, nudges and no punishment

- Status: Accepted
- Date: 2026-11-09
- Deciders: Dan
- Source: [characters.md](../characters.md), section 5

## Context

A pet that follows real time looks the same for hours. A pet that punishes neglect causes stress.

## Decision

The pet lives a compressed visual day. The default is approximately one hour for each pet day. The length is a setting for each pet. Needs advance slowly on real time. Neglect only makes the pet ask for interaction more. It never punishes. Care comes from taps, from voice through the assistant, and from work events (builds, PRs, calendar). Weather and holiday props (sunglasses, scarf, skates, seasonal hats) appear on the pet. There are no full scenes. The pet and the assistant have separate sleep rhythms. A tap wakes a character.

## Consequences

- The hub scheduler runs a pet clock for each pet.
- Work events become care inputs through rules.
