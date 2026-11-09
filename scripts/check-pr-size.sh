#!/usr/bin/env bash
# PR size cap (ADR-041). Counts added plus deleted lines against the base branch.
# The lockfile and docs are not counted. Set PR_SIZE_CAP to change the limit.
set -euo pipefail

base="${1:?usage: check-pr-size.sh <base-ref>}"
cap="${PR_SIZE_CAP:-600}"

changed=$(git diff --numstat "${base}...HEAD" -- . ':(exclude)pnpm-lock.yaml' ':(exclude)docs/**' \
  | awk '$1 != "-" { sum += $1 + $2 } END { print sum + 0 }')

echo "Changed lines (excluding lockfile and docs): ${changed}. Cap: ${cap}."
if [ "${changed}" -gt "${cap}" ]; then
  echo "This PR is too large. Split it into smaller slices." >&2
  exit 1
fi
