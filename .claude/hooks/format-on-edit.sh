#!/usr/bin/env bash
# PostToolUse hook (Edit|Write|MultiEdit): format the just-edited file with
# Biome. Biome's own config decides which files it actually touches; anything it
# doesn't recognize is skipped. Never fails the edit.
set -uo pipefail

read_field() {
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write((j.tool_input&&j.tool_input["'"$1"'"])||"")}catch{process.stdout.write("")}})'
}

input="$(cat)"
file="$(printf '%s' "$input" | read_field file_path)"

[ -n "$file" ] || exit 0
[ -f "$file" ] || exit 0

# Only ever touch files inside this project's tree.
case "$file" in
  "${CLAUDE_PROJECT_DIR:-/nonexistent}"/*) ;;
  *) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR}" || exit 0
npx --no-install biome format --write --files-ignore-unknown=true "$file" \
  >/dev/null 2>&1 || true
exit 0
