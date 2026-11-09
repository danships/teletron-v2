# ADR-040: Reuse libraries, do not adopt platforms

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), sections 1, 16

## Context

Good libraries exist. Platforms take over the core concepts.

## Decision

Reuse any library behind our own interfaces. Build what defines the system: the protocol, specs, scheduler model, routing and permission model. Each slice starts with a short reuse-vs-build round. Record the result as an ADR. Candidates: Vercel AI SDK or Mastra (agent harness), the official MCP TypeScript SDK, JSONata, DOMPurify, a canvas library, rpi-rgb-led-matrix, Whisper, Piper, openWakeWord, a small cron library.

## Consequences

- Core concepts stay ours.
- Decisions use the options that exist at that time.
