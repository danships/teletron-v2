# S1-PR6 implementation completed; PR metadata handoff pending

The original blocker was missing implementation, not a design decision. PR #8
contained only transport dependencies. The approved [PR6 plan](../specs/001-hub-and-first-display/006-websocket-node-sessions.md)
is now implemented, including AT-H01 through AT-H10 and the authentication /
revocation race regression. Authentication installs sessions within the existing
single-writer repository queue so revocation cannot leave a stale session online.

The hub now validates `HUB_PORT`, serves `/ws`, enforces exact grants, handles
presence, takeover, heartbeat, FIFO backpressure and frame limits, and disconnects
sessions on revocation or shutdown. Existing Proposed ADR-056 supplies the
reuse-vs-build decision: `ws` supplies the server absent from native Node APIs;
`@types/ws` supplies its declarations. No new dependencies, protected-path
changes, acceptance-criteria changes or shortcuts were added during this fix.
Scenes and replay remain in their later approved PRs.

Verification: Node.js 24, `pnpm check` (83 tests), production dependency audit,
and the unchanged 600-line PR-size check. The in-process session tests use a
memory-backed SuperSave repository boundary; they do not require MySQL.

Git read/write access works, but the environment has no GitHub CLI or API login.
The remaining handoff is to replace the stale incomplete PR description, remove
its `blocked` label and mark it ready for review. The implementation and this
report are preserved on `feat/s001-p006/websocket-node-sessions`. No merge is
authorized. The final response records the pushed commit and verified PR head.
