# S1-PR6 incomplete handoff

The WebSocket session implementation and AT-H01 through AT-H10 acceptance tests
have not been written. The branch only prepares the approved transport
dependencies. The implementation must coordinate authentication with revocation
so a lookup that overlaps a committed revocation cannot install a stale session.
This is an implementation task, not a request to change the approved design.

Remaining work: write the acceptance tests first, implement the approved plan,
run `pnpm check`, and review the total change against the 600-line limit.
