# ADR-016: Generic bridge nodes announce catalogs, values stream only when subscribed

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 6

## Context

External systems such as Home Assistant, Plex and Frigate must connect without system-specific logic in the hub.

## Decision

An external system connects through a bridge node. The bridge announces a catalog of sources and actions: names, types and metadata, no values. The hub subscribes only to what is on display. The bridge streams only subscribed values.

## Consequences

- The hub contains no system-specific logic.
- A minimum of data leaves the home.
