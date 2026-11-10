# S1-PR5 — Add node pairing and revocation commands

- Parent spec: [Spec 001](../001-hub-and-first-display.md)
- Slice PR: 5
- Ticket type: Story

## Overview

Add the temporary Slice 1 operator CLI and owner-only Unix control socket for
node creation, revocation and replacement-token issuance. The live hub owns all
serialized persistence commands; CLI processes send one validated command and receive one
response, and plaintext tokens cross stdout exactly once.

---

## Implementation Steps

### Backend

1. [ ] Write AT-C01 through AT-C07 as failing integration tests before command
       handlers. Use a temporary owner-only directory, a real Unix socket and
       the PR4 database harness.
2. [ ] Add `HUB_CONTROL_SOCKET` parsing in `apps/hub/src/config/control.ts`.
       Require an absolute path in an existing owner-only directory and never
       accept TCP, relative or auto-created parent paths.
3. [ ] Add strict, newline-delimited one-command request/response schemas in
       `apps/hub/src/control/control-messages.ts` for `node.create`,
       `node.revoke` and `node.issue-token`. Bound request bytes below the
       protocol JSON limit and reject trailing/multiple commands.
4. [ ] Add `apps/hub/src/nodes/node-credentials.ts` using
       `crypto.randomBytes(32).toString('base64url')` and SHA-256. Return plaintext
       only from the creation boundary; never attach it to an entity or error.
5. [ ] Add `apps/hub/src/nodes/node-commands.ts` to validate exact grants and
       call PR4 single-document repository operations through the shared hub queue. Inject `closeTokenSession(tokenId)`;
       PR5 uses a no-session implementation and PR6 supplies the live registry.
6. [ ] Add `apps/hub/src/control/control-server.ts` using Node Unix sockets.
       Remove only a positively identified stale socket at the configured exact
       path, set the socket entry to mode `0600`, accept one command per
       connection, write one response and close.
7. [ ] Add `apps/hub/src/control/control-client.ts` and
       `apps/hub/src/node-cli.ts`. Implement `create`, `revoke` and `issue-token`
       subcommands with explicit arguments and exit codes; avoid a CLI framework.
8. [ ] Print node ID, immutable name and plaintext token once on successful
       create/issue only. Send all other diagnostics to stderr with token ID at
       most; add redaction assertions over captured logs, stdout and errors.
9. [ ] Wire control-server startup/shutdown into `apps/hub/src/index.ts` and add
       an `apps/hub/package.json` script for the temporary CLI.
10. [ ] Run IPC/database tests, inspect socket permissions on the target OS, then
        run `pnpm check`.

---

## Acceptance Tests Covered

- **AT-C01:** Given a valid unique name and explicit display grant, when the
  pairing command succeeds, then it prints node ID, name and a 32-byte base64url
  token exactly once.
- **AT-C02:** Given a created token, when storage and captured logs are inspected,
  then only its SHA-256 hash exists and the plaintext is absent.
- **AT-C03:** Given an invalid/duplicate name or invalid/duplicate grant, when
  pairing is attempted, then it fails without a partial node or token.
- **AT-C04:** Given an active token, when it is revoked, then `revoked_at` is set,
  the command does not expose the token and the active-session boundary is
  invoked.
- **AT-C05:** Given an already revoked or unknown token ID, when revocation is
  attempted, then it fails clearly and changes nothing else.
- **AT-C06:** Given a logical node whose prior token is revoked, when a
  replacement is issued, then the node ID and name stay unchanged, new grants
  are stored and the new plaintext token is shown exactly once.
- **AT-C07:** Given the hub control socket, when its listener and filesystem entry
  are inspected, then it is a Unix socket available only to the hub OS user;
  malformed or multi-command connections fail without a database write.

---

## Edge Cases & Error Handling

- **Existing path is not a socket:** Fail startup and leave it untouched.
- **Abrupt hub exit:** On restart, unlink only the configured stale Unix socket
  after confirming its file type and owner.
- **Client disconnect during token response:** The token remains valid but is not
  recoverable; the operator must revoke it and issue a replacement.
- **Revocation callback failure:** Do not roll back a committed revocation; return
  a safe operational failure and retry session closure by token ID.

---

## Security Considerations

- **Authentication and authorization:** Filesystem ownership/mode is the only
  temporary local authorization mechanism; the socket is never exposed by HTTP
  or Caddy.
- **Input validation:** One bounded strict command per connection; grants use the
  shared closed schema.
- **Sensitive data exposure:** Plaintext tokens exist only in local variables and
  the one successful stdout response; tests scan every other output surface.
- **Audit logging:** Record operation, node ID, token ID and outcome, never token
  plaintext or database URL.
