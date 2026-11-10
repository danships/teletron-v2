# Deviations

- PR #2: `classifyManifestGrants` takes a node name as a third argument so it can return the capability addresses required by the session contract.

- PR #3: Scene validation no longer imposes a 60,000-byte limit; the specified 64 KiB frame limit applies to messages instead.

- PR #4: Nodes and their token history use one SuperSave document with an opaque storage ID and a separate public node UUID. A single hub command queue enforces uniqueness and token rotation because the existing SuperSave API does not provide relational constraints or transactions (ADR-057).
