# AGENTS.md

Rules for AI agents in this repo. This file is a protected path covered by the plan approval rule below.

## Context

Teletron is Dan's home platform for data, displays, actions and AI assistants, managed by agents through MCP. A TypeScript hub on a VPS owns all state and decisions. Thin nodes (Pi with screen and mic, browser, laptop, Home Assistant add-on) connect over one wss:// connection and render, speak, listen and bridge. It is a home project, not production grade, but it must grow for years.

Everything you need is in this repo. Read these before you start:

- [docs/architecture.md](docs/architecture.md): the full design.
- [docs/roadmap.md](docs/roadmap.md): the slices and their status.
- [docs/characters.md](docs/characters.md): the assistant, the pet and their skins.
- [docs/adr/](docs/adr/README.md): each decision and its reason.
- [docs/specs/](docs/specs/README.md): the spec for the current slice.
- [docs/proposals/](docs/proposals/README.md): drafts that are input for a spec, for example the wire protocol draft. ADRs and specs win over proposals.

## Layout

- `apps/hub`: hub service.
- `apps/node`: node client.
- `packages/protocol`: wire protocol shared by hub and nodes.
- `docs/`: architecture, roadmap, ADRs, specs.

## Workflow

1. Find the current slice in the roadmap and its spec.
2. No approved spec? Write a plan with the spec template (files, concepts, tables, protocol messages, dependencies, non-goals). Then stop and wait for approval.
3. Do a reuse-vs-build round. Record it as an ADR with status `Proposed`.
4. Write the acceptance tests first. Do not weaken, skip or remove them.
5. Implement inside the spec. Do not touch non-goals.
6. Run `pnpm check`.
7. Commit, push, and create or update the pull request. Verify the remote handoff below before ending the run.

## Agent completion and remote handoff

- An implementation request authorizes committing, pushing the assigned branch and opening a PR to `main`. Use the assigned branch; for an existing PR, update that PR. Do not merge unless Dan asks.
- Continue from investigation through tests, implementation and PR creation. Reading the plan, creating a local branch or announcing next steps is not completion. A small compatible interface addition is implementation work, not a reason to stop.
- Check GitHub authentication and remote access before substantial work. Commit and push coherent progress during long runs so an ephemeral workspace is not the only copy. Never commit secrets or unrelated user changes.
- Before reporting success, push the final commit and verify with GitHub that the PR is open, targets `main`, uses the assigned branch and has that commit as its head. A successful local commit, push attempt or PR-create attempt is not sufficient evidence. Reuse an existing PR rather than creating a duplicate.
- If blocked by a design decision, approval requirement or failing checks that cannot be resolved within scope, preserve safe progress on the remote branch and open or update a draft PR with the `blocked` label. Describe the blocker, checks run, remaining work and decision needed. If no implementation changes exist, commit a concise blocker report under `docs/blockers/` to make the draft reviewable; do not change the approved spec or acceptance criteria. A draft is an incomplete handoff, not success.
- If authentication, network access or GitHub prevents that handoff, report the exact failed operation and recovery details (branch, commit SHA, unpushed files and blocker). Do not claim a PR exists or the task is complete. Do not discard local work.
- The final response must include the verified PR URL, pushed commit SHA, check results and any remaining blockers. If no PR could be created, explicitly state **INCOMPLETE — no PR** and provide the recovery details above. An ordinary final response or an orchestrator's `done` status does not establish completion.

## Plan approval and protected paths

Dan's approval of a spec or plan authorizes all changes it includes, including changes to protected paths: `packages/protocol/`, `apps/hub/src/db/schema/`, `docs/specs/`, and `AGENTS.md`. No additional explicit approval from Dan is needed for each file, protected path, implementation step, or PR within that scope. PR plans that expand an approved spec without changing its scope inherit that approval.

Link the approved spec or plan in the PR description and identify protected-path changes. Agents and reviewers must use that approval rather than request it again. A direct request from Dan also authorizes the changes needed to carry out that request, including changes to these rules.

Ask for approval only when work adds scope or changes an approved design or acceptance criteria. Writing a new plan does not approve it. Do not relax `eslint.config.mjs`, `.dependency-cruiser.cjs` or `scripts/check-pr-size.sh`.

## Rules

- Use the simplest solution that works. No abstraction without a concrete second use. No speculative code.
- Stay in the lint budgets: 300 lines per file, 60 per function, complexity 10. Split code. Do not disable rules.
- Use strict TypeScript, `type` instead of `interface`, no `any`, kebab-case file names.
- Packages never import apps. Apps never import other apps.
- Follow the ADRs. If a task conflicts with an ADR, stop and ask.
- No hardcoded secrets. Use environment variables. Specs reference credentials by name.
- Use pnpm with `--ignore-scripts`. Give a reason in the PR for each new dependency.
- Use conventional commits. Keep PRs under 600 changed lines. Name shortcuts in the PR.
- Update `docs/roadmap.md` when a slice starts or finishes.

## Commands

`pnpm setup`, `pnpm dev:hub`, `pnpm dev:node`, `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm check`.
