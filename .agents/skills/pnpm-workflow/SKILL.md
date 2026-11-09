---
name: pnpm-workflow
description: Use when running scripts, installing packages, or managing workspace dependencies in Teletron. Covers the repo's pnpm commands, dependency safeguards, workspace boundaries, and required quality gate.
---

# Teletron pnpm workflow

Run commands from the repository root unless a package-specific command clearly requires a
workspace filter. Teletron targets Node.js 24 and pins pnpm in the root `package.json`.

## Dependency rules

- Use pnpm only; never use npm or Yarn.
- Install dependencies with scripts disabled: `pnpm install --ignore-scripts`.
- Add a dependency to the narrowest owning workspace, for example
  `pnpm --filter @teletron/hub add --ignore-scripts <package>`.
- Use `-D` only for development dependencies.
- Give a concrete reason for every new dependency in the PR.
- Respect `minimumReleaseAge` and `onlyBuiltDependencies` in `pnpm-workspace.yaml`. Do not bypass
  those supply-chain controls. A package that genuinely needs an install script requires a
  documented project decision before it is allowlisted.
- Reuse Node.js or browser APIs where the accepted spec or ADR chooses them. Do not add a library
  that contradicts the current slice's reuse-vs-build ADR.

## Workspace boundaries

The workspaces are `apps/*` and `packages/*`.

- Packages never import apps.
- Apps never import other apps.
- Shared wire schemas and types belong in `packages/protocol`, which is a protected path.
- Add a dependency to the workspace that imports it rather than to the root by convenience.

## Commands

| Purpose            | Command          |
| ------------------ | ---------------- |
| Initial setup      | `pnpm setup`     |
| Hub development    | `pnpm dev:hub`   |
| Node development   | `pnpm dev:node`  |
| Build              | `pnpm build`     |
| Type check         | `pnpm typecheck` |
| Lint               | `pnpm lint`      |
| Tests              | `pnpm test`      |
| Full required gate | `pnpm check`     |

Use the narrowest useful check while iterating, then run `pnpm check` before handing off an
implementation. Do not relax ESLint, dependency-cruiser, or PR-size checks to make a change pass.
