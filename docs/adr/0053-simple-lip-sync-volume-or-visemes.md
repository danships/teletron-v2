# ADR-053: Simple lip sync: volume or visemes

- Status: Accepted
- Date: 2026-11-09
- Deciders: Dan
- Source: [characters.md](../characters.md), section 6

## Context

Characters with a mouth look wrong when they talk without moving it.

## Decision

Only skins with a mouth use lip sync. The node opens the mouth with the volume of the TTS audio. When the TTS provider gives visemes, the node uses them instead.

## Consequences

- The TTS output needs an optional viseme channel in the protocol.
