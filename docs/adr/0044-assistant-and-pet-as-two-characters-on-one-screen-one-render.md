# ADR-044: Assistant and pet as two characters on one screen, one render loop

- Status: Accepted
- Date: 2026-11-09
- Deciders: Dan
- Source: [characters.md](../characters.md), section 1
- Amends: ADR-036

## Context

ADR-036 gives each screen one character. Dan wants a reliable assistant and a playful pet that belongs to the assistant. A Pi has limited CPU and GPU.

## Decision

There are two separate characters: the assistant and its pet. Both can share one screen. The display node renders both in one render loop. The hub owns the state of both characters. Display nodes only render.

## Consequences

- ADR-036 now allows an assistant and a pet together on one screen.
- Each character keeps its own personality and memory (ADR-037).
- The render loop on the node must handle two characters within the Pi budget.
