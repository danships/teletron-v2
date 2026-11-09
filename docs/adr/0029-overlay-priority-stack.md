# ADR-029: Overlay priority stack

- Status: Accepted, amended by ADR-048
- Date: 2026-11-08
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 9

## Context

Events must interrupt the playlist, but not all events are equally important.

## Decision

Rules map events to overlays with a priority, a duration and an expiry. Each display has a priority stack. A higher priority interrupts. Equal or lower priority waits in the queue. An interrupted overlay resumes with its remaining time. An expired overlay is dropped. Chatty events can merge, for example "3 new subscribers".

## Consequences

- A doorbell beats a follower count.
- Stale alerts do not stay on screen.

## Amendments

- ADR-048: an overlay priority can go up over time while it is ignored, but never above its ceiling.
