# Spec NNN: <Slice name>

- Status: Proposed | Approved | Done
- Roadmap slice: N (see ADR-043)
- Related ADRs: ADR-NNN

## Goal

<In one or two sentences, describe the user-visible outcome and what is visible on the wall when this slice is done.>

## Plan

Describe the slice at architecture level. Put file-level implementation details in the PR plans made from [pr-template.md](pr-template.md).

- **Files and packages touched:** <List the areas of the repository this slice affects.>
- **New concepts:** <Name and define each concept introduced by the slice, or write "None.">
- **New or changed tables (protected path):** <Name each table and summarize its purpose and change, or write "None.">
- **New or changed protocol messages (protected path):** <Name each message and describe its direction and purpose, or write "None.">
- **New dependencies:** <Name each dependency and why it is needed, or write "None.">
- **Reuse-vs-build result:** <Link to the Proposed ADR required by ADR-040 and summarize the decision.>

## PR Plan

Split the slice into PRs. Each PR must stay under 600 changed lines, have its own tests, and leave the system in a working state. Dan approves this list with the spec. Before implementing a PR, expand its entry into an actionable plan using [pr-template.md](pr-template.md).

1. [ ] **<Conventional PR title>** — <What it adds, its boundaries, which acceptance tests it covers, and how to verify it.>

## Non-goals

Things this slice must not do. Agents must not implement these, even if they seem easy.

- <Explicitly excluded behaviour, component, or follow-up work.>

## Acceptance Tests

Each item becomes a test. Write observable outcomes, including relevant failure paths. The implementing agent must write these tests first and must not weaken, skip, or remove them.

- [ ] Given <starting state>, when <action>, then <observable outcome>.

## Shortcuts

Shortcuts taken on purpose, why they are acceptable for this slice, and when to revisit them.

- **<Shortcut>:** <Reason and revisit trigger.>
