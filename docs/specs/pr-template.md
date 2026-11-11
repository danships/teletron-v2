# <KEY> — <Title>

<!-- Produce a complete, specific, actionable plan a developer can execute without further design work. Do not hedge or leave sections vague. -->

- Parent spec: [Spec NNN](NNN-short-name.md)
- Slice PR: <PR plan item number>
- Ticket type: Story | Bug | Task | Spike

<!-- Approval is inherited from the approved parent spec when this plan stays within its scope, including protected-path changes. Identify affected protected paths below; do not add a separate approval step. Scope or design changes need approval. -->

## Overview

<In two to four sentences, explain what this PR does, why it matters, and which part of the system it touches. Adapt the plan's depth to the ticket type. State uncertain details explicitly and mark each one _(assumption)_.>

---

## Tech Stack

<!-- Omit this section if the PR uses only existing stack choices. Every dependency needs a concrete reason. Install packages with pnpm --ignore-scripts. -->

- `<Library, service, or integration>` — <why it is needed>

---

## Data Model

<!-- Omit this section if no schema changes are needed. Repeat the entity block for every new or modified entity. Database schema files are a protected path. -->

### `<table_name>`

<Purpose of the table and whether it is new or modified.>

| Field          | Type     | Notes                                                     |
| -------------- | -------- | --------------------------------------------------------- |
| `<field_name>` | `<type>` | <Nullability, default, constraints, indexes, and meaning> |

**Relationships**

- `<field_name>` → `<target_table>.<target_field>` — <cardinality and delete/update behaviour>

**Migration strategy**

- <Additive, destructive, or multi-step strategy, including backfill and rollback details where relevant>

---

## API

<!-- Omit this section if no endpoints are added or changed. Repeat the route block for every added or changed route. -->

### `<METHOD> <path>`

- **Auth:** <public, session, API key, or required role>
- **Request body / query parameters:**

  | Field          | Type     | Required | Notes                          |
  | -------------- | -------- | -------- | ------------------------------ |
  | `<field_name>` | `<type>` | Yes / No | <Validation rules and meaning> |

- **Response:**

  ```json
  {
    "field": "value"
  }
  ```

- **Errors:**

  | Status          | Reason                                   |
  | --------------- | ---------------------------------------- |
  | `<status_code>` | <When and why this response is returned> |

---

## Implementation Steps

<!-- Write an ordered checklist a developer can execute top-to-bottom without further design work. Name concrete files, functions, components, and tests. Earlier steps must not depend on later ones. Keep only the layer headings the PR needs. -->

### Database

1. [ ] <Specific, actionable step naming the schema or migration file and exact change.>

### Backend

1. [ ] <Specific, actionable step naming files, functions, services, or handlers.>

### Frontend / Node

1. [ ] <Specific, actionable step naming components, state, interactions, and styling.>

### Tests and Documentation

1. [ ] <Specific acceptance, unit, integration, or end-to-end tests to add, including expected behaviour.>
2. [ ] <Documentation or operational guidance to update.>

---

## Acceptance Tests Covered

<!-- Copy the exact acceptance-test identifiers or text from the approved parent spec. Do not weaken, skip, or rewrite them. -->

- <Acceptance test from the parent spec>

---

## Edge Cases & Error Handling

- **<Scenario>:** <Expected behaviour.>

---

## Security Considerations

- **Authentication and authorization:** <Where and how access is enforced.>
- **Input validation:** <Fields, limits, formats, and rejection behaviour.>
- **Sensitive data exposure:** <How logs, errors, protocol messages, API responses, and UI avoid exposing sensitive data.>
- **Audit logging:** <Events to record and the data included or intentionally excluded.>

<!-- If no feature-specific concerns apply, replace the list above with: "No special concerns — standard auth middleware applies." -->

---

## Open Questions

<!-- Optional. Omit this section if there are no genuine open questions. Every item must name the role responsible for confirming it. -->

- <Decision or unknown> _(to confirm with <role>)_
