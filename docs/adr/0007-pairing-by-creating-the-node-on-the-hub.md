# ADR-007: Pairing by creating the node on the hub

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 4

## Context

Nodes need an identity and a secret. A pairing UI adds work.

## Decision

Create a node on the hub through MCP or the CLI. The hub returns a node ID and a token. The hub shows the token one time and stores only a hash. The token can carry granted capabilities. A manifest cannot declare more than the token grants. Revocation disconnects the node immediately.

## Consequences

- No pairing UI is necessary.
- A lost token cannot be recovered. Create a new token.
