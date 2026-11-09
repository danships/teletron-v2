# ADR-035: Assistant is a role a node takes on, the voice loop runs locally

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 13

## Context

Voice needs low latency. The speaker is near a node, not near the hub.

## Decision

An assistant is a role that a node takes on. The voice loop runs on the node near the speaker. It calls STT, LLM and TTS through the router, local first. A browser tab can be a full assistant node with built-in speech. Triggers (wake word, button, touch) are input capabilities of the node. Data and actions go through a hub tool interface that mirrors MCP, with the same permission and confirmation rules.

## Consequences

- Low latency, local providers first.
- Two-way low-latency audio for the pet stays possible.
