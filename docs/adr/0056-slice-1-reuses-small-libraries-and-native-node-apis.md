# ADR-056: Slice 1 reuses small libraries and native Node APIs

- Status: Proposed
- Date: 2026-11-09
- Deciders: Dan
- Source: [Spec 001](../specs/001-hub-and-first-display.md)
- Applies: ADR-040 reuse-vs-build round for roadmap slice 1

## Context

Slice 1 needs runtime validation for a long-lived protocol and module format, a
WebSocket server, MySQL access, two HTTP data sources and a browser renderer on
a Raspberry Pi. The protocol, module format and source lifecycle define
Teletron and must remain ours. Transport framing, schema validation, database
drivers and browser primitives do not.

The wire-protocol proposal suggested `ws` plus hand-written validation. The
repository already targets Node.js 24 and TypeScript 6. Node 24 has stable
browser-compatible WebSocket and `fetch` clients, but no WebSocket server. Zod
is the preferred schema library for Teletron and provides runtime parsing,
TypeScript type inference and JSON Schema export from one definition.

## Decision

- Define Teletron's protocol, module, scene and source-lifecycle semantics in
  this repository.
- Use Zod in `packages/protocol` as the source for runtime schemas and inferred
  TypeScript types. Keep it behind schemas, parsers and types exported by
  `@teletron/protocol`; applications do not define competing protocol schemas.
- Use `ws` only for the hub WebSocket server. Use the Node.js 24 global
  `WebSocket` client in the Pi node and the browser's native client APIs.
- Use `supersave` with `mysql2`, as required by ADR-004. Use only supersave's
  data access layer; do not expose its optional HTTP API as Teletron's API.
- Use Node's built-in `fetch` for Open-Meteo and the YouTube Data API. Do not
  add provider SDKs.
- Use Node's built-in Unix-domain-socket support for owner-only local hub CLI
  commands that must update live sessions. This CLI and IPC transport are
  temporary Slice 1 scaffolding: Slice 3 replaces and removes them after the
  agent MCP/API exposes the same operations. Do not add a command framework,
  expose this channel on the network or preserve compatibility with it.
- Render with browser DOM and CSS plus a small fixed component renderer. Use
  Node's built-in HTTP and server-sent events on loopback between the Pi node
  process and its kiosk browser. Do not add React, a UI framework or a bundler.
- Use `happy-dom` only as a development dependency for Vitest DOM tests. Do not
  add a browser automation framework in this slice.
- Use `crypto.randomUUID` for IDs and `crypto.randomBytes` for node tokens. Do
  not add a ULID package.

## Consequences

- Slice 1 adds four runtime dependencies: `zod`, `ws`, `supersave` and
  `mysql2`, plus `happy-dom` and, if the selected `ws` release needs it,
  `@types/ws` as development dependencies.
- Protocol types and validation cannot drift because both come from Zod
  schemas.
- The hub owns only WebSocket protocol semantics; Socket.IO rooms, events and
  fallback transports do not become part of Teletron.
- The Pi node has one outbound connection to the hub. Its loopback HTTP/SSE
  connection is an internal renderer boundary, not another Teletron node link.
- Only the hub operation functions survive Slice 3; the local CLI executable,
  command shapes, control-socket server and related tests are removed when MCP/
  API coverage replaces them.
- Provider responses still need Teletron-owned validation and mapping.
- Rich UI framework features and a provider SDK can be reconsidered only when
  a concrete later slice needs them.
