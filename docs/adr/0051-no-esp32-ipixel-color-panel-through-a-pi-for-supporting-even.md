# ADR-051: No ESP32; iPixel Color panel through a Pi, for supporting events only

- Status: Accepted
- Date: 2026-11-09
- Deciders: Dan
- Source: [architecture.md](../architecture.md), section 2, and [characters.md](../characters.md), section 8
- Amends: ADR-003, ADR-023

## Context

Earlier plans had an ESP32 with a 64x128 matrix and C++ code. The RGB matrix is now an iPixel Color Bluetooth panel.

## Decision

There is no ESP32 in the system. A Pi controls the iPixel Color panel over Bluetooth with pre-rendered GIF loops and images, not with live frame streaming. The panel shows supporting events only (attention, hunger, thinking), not the pet.

## Consequences

- ADR-003: there is no C++ code. All code is TypeScript.
- ADR-023: there are no dumb clients. Rendering stays on nodes. The Pi renders the GIF loops.
- The reuse candidate rpi-rgb-led-matrix no longer applies. Slice 5 looks for an iPixel Bluetooth library.
