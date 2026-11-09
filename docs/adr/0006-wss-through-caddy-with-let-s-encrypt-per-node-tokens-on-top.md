# ADR-006: wss:// through Caddy with Let's Encrypt, per-node tokens on top

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), sections 5, 15
- Supersedes: earlier plain ws:// decision (not recorded as an ADR)

## Context

Nodes connect over the internet to the VPS. Tokens must not travel in clear text. An earlier decision used plain ws:// on the LAN.

## Decision

Terminate TLS in Caddy with Let's Encrypt certificates. Nodes connect with wss://. Per-node tokens authenticate on top of TLS.

## Consequences

- Caddy is part of the hub deployment.
- This supersedes the earlier plain ws:// decision.
