# Proposals

Draft designs that are input for a spec. A proposal is not a decision. The ADRs and the approved specs win when they conflict with a proposal.

## Rules

- Add a proposal as `NNN-short-name.md`, unchanged from its source. Put the source and the date at the top.
- Below the source line, list the known conflicts with the ADRs. Do not fix them in the proposal itself.
- The spec that uses the proposal decides each conflict.
- When a spec replaces the proposal, set the status line to `Replaced by spec NNN`. Do not delete the proposal.

## Index

| File                                                     | Topic                                 | Used by                 | Status |
| -------------------------------------------------------- | ------------------------------------- | ----------------------- | ------ |
| [001-wire-protocol-draft.md](001-wire-protocol-draft.md) | Wire protocol, Draft 1 (Claude Fable) | Slice 1, PR 1 and later | Draft  |
