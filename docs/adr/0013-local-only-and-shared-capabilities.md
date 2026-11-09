# ADR-013: Local-only and shared capabilities

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 4

## Context

Some capabilities only make sense on their own node.

## Decision

Each capability is local-only or shared. A local-only capability serves only its own node, for example the built-in speech of a browser. A shared capability is routable for all nodes, for example GPU voice on the laptop.

## Consequences

- The router does not offer local-only capabilities to other nodes.
