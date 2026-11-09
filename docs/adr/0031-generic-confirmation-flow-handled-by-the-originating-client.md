# ADR-031: Generic confirmation flow handled by the originating client

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 10

## Context

Some actions need a human yes. Clients ask in different ways.

## Decision

An action can require confirmation. The hub creates a pending confirmation with an ID and a short expiry, and returns it to the originating client. The client asks in its own way: voice, button or touch. No answer means denied.

## Consequences

- The hub stays independent of voice, button or touch input.
