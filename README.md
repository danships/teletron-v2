# Teletron

Home platform for data sources, displays, actions and AI assistants. A TypeScript hub manages thin nodes over WebSocket. Agents control it through MCP.

## Start

Requirements: Node.js 24 and pnpm 11.

```sh
pnpm setup
cp .env.example .env
pnpm check
```

## Agent workflow

An approved spec or plan authorizes the changes it includes, including protected paths and PR plans that expand it within scope. Agents and PR reviewers must not request additional explicit approval from Dan for that work. See [AGENTS.md](AGENTS.md#plan-approval-and-protected-paths) for the approval rule.

## Docs

- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Decisions (ADRs)](docs/adr/README.md)
- [Agent rules](AGENTS.md)
