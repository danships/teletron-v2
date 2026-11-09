# Specs

Each roadmap slice has one spec in this folder (ADR-041). This is a protected path. Dan approves every change.

## Process

1. The agent writes the slice plan in a draft spec with status `Proposed` using [template.md](template.md).
2. Dan approves the plan. The status changes to `Approved`.
3. Before implementing each PR in the approved breakdown, the agent writes a complete implementation plan in the PR description using [pr-template.md](pr-template.md).
4. The agent writes the acceptance tests covered by that PR first.
5. The agent implements the PR. The agent does not change the spec or weaken the acceptance tests.
6. When the full slice is merged, the spec status changes to `Done`.

## File names

Slice specs use `NNN-short-name.md`, for example `001-hub-and-first-display.md`.

Use [template.md](template.md) for the slice spec and [pr-template.md](pr-template.md) for each PR implementation plan.
