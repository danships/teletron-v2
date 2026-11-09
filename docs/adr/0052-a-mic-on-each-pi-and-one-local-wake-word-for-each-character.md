# ADR-052: A mic on each Pi and one local wake word for each character

- Status: Accepted
- Date: 2026-11-09
- Deciders: Dan
- Source: [characters.md](../characters.md), section 8

## Context

Voice must answer on the screen where the person is. The assistant and the pet each need to be addressable.

## Decision

Each Pi has a mic paired with its display. The display of that Pi answers. Each character has its own local wake word, for example with openWakeWord. The user picks the names. The agent flags names that can cause false triggers. The STT, LLM and TTS fallback stays as in ADR-012.

## Consequences

- Wake words are input capabilities of the node (ADR-035).
- Wake word models must exist or be trained for each chosen name.
