# ADR-049: Identity set explicitly on each display, with a default identity

- Status: Accepted
- Date: 2026-11-09
- Deciders: Dan
- Source: [characters.md](../characters.md), section 7, and [architecture.md](../architecture.md), section 14
- Supersedes: ADR-038

## Context

ADR-038 lets the assistant ask who is speaking at session start. Shared screens need a simpler and more visible way. Presence detection is out of scope.

## Decision

A person sets the identity on each display, for example with a "who's here" button on a shared screen. The display keeps the last identified person. Without one, it uses a default identity. There is no presence detection and no voice recognition.

## Consequences

- ADR-038 is superseded.
- Sessions and personal pet layers use the identity of the display.
