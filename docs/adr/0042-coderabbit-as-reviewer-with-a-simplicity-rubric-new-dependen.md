# ADR-042: CodeRabbit as reviewer with a simplicity rubric, new dependencies flagged

- Status: Accepted
- Date: 2026-11-08
- Deciders: Dan
- Source: [AGENTS.md](../../AGENTS.md)

## Context

CodeRabbit is already in use. Hard blocks on dependencies are too restrictive.

## Decision

CodeRabbit reviews every PR. Path instructions carry a simplicity rubric: out-of-spec changes, unneeded abstractions, speculative code, new dependencies and protected-file changes. New dependencies are not blocked. The PR must give a reason, and CodeRabbit flags them.

## Consequences

- Implemented in .coderabbit.yaml and the PR template.
