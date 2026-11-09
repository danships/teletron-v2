---
name: zod-types-schemas
description: Use when defining or changing Teletron runtime schemas and their TypeScript types, especially the wire protocol, manifests, scenes, modules, configuration, and provider responses. Covers schema ownership, open-versus-closed objects, inference, exports, and acceptance tests.
---

# Teletron Zod schemas and types

Zod schemas are the runtime source of truth for untrusted or persisted data. Infer TypeScript types
from those schemas so validation and static types cannot drift.

## Ownership and approval

- Protocol, manifest, module, and scene schemas belong in `packages/protocol`; applications import
  them rather than defining competing schemas.
- `packages/protocol` is protected. Ask Dan before changing it, even when the change follows an
  approved spec.
- Read the current approved spec and acceptance cases before editing. If no approved spec covers
  the schema change, write the required plan and stop for approval.
- Provider-response and process-configuration schemas belong to the app that owns that boundary
  unless the accepted design explicitly shares them.

## Schema rules

- Export each schema and infer its type with `z.infer<typeof schema>`.
- Use `type`, never `interface`, and avoid handwritten duplicates of schema-derived shapes.
- Use discriminated unions for message or component variants with a stable discriminator.
- Reject invalid numbers explicitly: require integers, non-negative values, ranges, or finite values
  as the domain demands.
- Validate identifiers, names, paths, URLs, limits, and enum tokens at the boundary instead of
  relying on downstream coercion.
- Keep schemas and files small enough to remain within Teletron's line, function, and complexity
  budgets. Use kebab-case filenames.

## Open and closed objects

Match the compatibility policy in the approved spec:

- Additive transport envelopes, known message bodies, and manifest capability parameters accept and
  strip unknown object fields.
- Declarative scenes, components, and capability grants reject unknown fields because an ignored
  field could acquire behavior later.
- Do not choose passthrough, stripping, or strict rejection implicitly. Add an acceptance test that
  makes the intended policy visible for each new boundary.

## Exports and parsing

Expose schemas, inferred types, and any public parse helpers through `packages/protocol/src/index.ts`.
Apps should call the shared parser at ingress and then operate on the parsed type. Errors sent across
a trust boundary must be safe and must not include credentials, tokens, raw provider payloads, or
internal exception details.

## Acceptance tests

Write tests before implementation. Cover at least:

- the smallest valid value and representative full value;
- every discriminator variant;
- required-field, type, range, format, and size failures;
- the intended unknown-field behavior;
- dangerous property-path segments such as `__proto__`, `prototype`, and `constructor` where paths
  are accepted;
- forward-compatibility behavior required by the protocol version policy.

Do not replace focused schema assertions with snapshots. Finish with `pnpm check`.
