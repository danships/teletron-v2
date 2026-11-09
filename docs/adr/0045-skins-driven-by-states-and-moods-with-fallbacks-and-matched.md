# ADR-045: Skins driven by states and moods, with fallbacks and matched pairs

- Status: Accepted
- Date: 2026-11-09
- Deciders: Dan
- Source: [characters.md](../characters.md), section 3

## Context

Characters need many looks, from pixel sprites to rigged 3D models. Agents make skins. ADR-021 allows no arbitrary code.

## Decision

A skin is a data package: a JSON manifest, an animation map and model files. The manifest declares the supported activity states (idle, listening, thinking, speaking, sleeping), moods, props, a playfulness level and whether it has a mouth. Unsupported states and moods fall back without errors. Render types range from procedural eyes and pixel sprites, to Rive and Live2D, to GLB and VRM through three.js. One `character` component renders skins. Skins contain no scripts. Runtimes ship with the node. Assistant and pet skins come as matched pairs. Mix and match is allowed with a soft "styles clash" warning. Only technical limits block a skin. Generic animations map to states and moods, with procedural layers on top. The assistant wears props only when the playfulness of its skin allows it.

## Consequences

- ADR-021 stays: the component library gets one `character` component, not free code.
- Model files are assets (ADR-025).
- Display nodes declare the render types they support.
