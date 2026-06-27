#!/usr/bin/env bash
# PostToolUse hook (Bash): after a `git commit`, nudge to record the reasoning
# in a local notes/ entry. Surfaces a system message; never blocks.
set -uo pipefail

read_field() {
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write((j.tool_input&&j.tool_input["'"$1"'"])||"")}catch{process.stdout.write("")}})'
}

input="$(cat)"
cmd="$(printf '%s' "$input" | read_field command)"

if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+commit'; then
  printf '%s' '{"systemMessage":"Reminder: capture the why behind this commit in a notes/ entry (local-only, gitignored). Do not reference notes/ or ADR numbers in commits or PRs."}'
fi
exit 0
