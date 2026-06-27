#!/usr/bin/env bash
# PreToolUse hook (Bash): when a `gh pr create` is about to run, run the full CI
# locally first and BLOCK the PR if it fails. Keeps red PRs from being opened.
set -uo pipefail

read_field() {
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write((j.tool_input&&j.tool_input["'"$1"'"])||"")}catch{process.stdout.write("")}})'
}

input="$(cat)"
cmd="$(printf '%s' "$input" | read_field command)"

# Only act when a PR is about to be created.
if ! printf '%s' "$cmd" | grep -Eq 'gh[[:space:]]+pr[[:space:]]+create'; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
if out="$(npm run ci 2>&1)"; then
  exit 0
fi

{
  echo "Pre-PR check failed: 'npm run ci' did not pass — refusing to open a red PR."
  echo "Fix the errors below, then retry:"
  echo "---"
  printf '%s\n' "$out" | tail -n 25
} >&2
exit 2
