# Slice 1 PR instructions

These implementation plans expand the PR ordering in
[Spec 001](../001-hub-and-first-display.md), which resolves the conflicts in
[wire-protocol proposal 001](../../proposals/001-wire-protocol-draft.md).
Execute them in order. Before starting a plan, confirm that Spec 001 is
`Approved`, copy that plan into the PR description, write its listed acceptance
tests first, and keep the PR below 600 changed lines.

| PR  | Plan                                                                            |
| --- | ------------------------------------------------------------------------------- |
| 1   | [Protocol envelope and binary header](001-protocol-envelope.md)                 |
| 2   | [Node session messages](002-node-session-messages.md)                           |
| 3   | [Web scenes and display messages](003-web-scenes-and-display-messages.md)       |
| 4   | [Persist nodes and token grants](004-persist-nodes-and-token-grants.md)         |
| 5   | [Node pairing and revocation commands](005-node-pairing-and-revocation.md)      |
| 6   | [WebSocket node sessions](006-websocket-node-sessions.md)                       |
| 7   | [Pi display connection and resume](007-pi-display-connection.md)                |
| 8   | [Versioned web scenes](008-versioned-web-scenes.md)                             |
| 9   | [Web scene renderer](009-web-scene-renderer.md)                                 |
| 10  | [Pull-source lifecycle](010-pull-source-lifecycle.md)                           |
| 11  | [Open-Meteo weather](011-open-meteo-weather.md)                                 |
| 12  | [YouTube followers and wall display](012-youtube-followers-and-wall-display.md) |

These plans do not approve implementation. Changes to `packages/protocol/` and
`apps/hub/src/db/schema/` remain protected and require Dan's approval when the
corresponding PR starts, as required by `AGENTS.md` and Spec 001.
