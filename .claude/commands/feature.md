---
description: Start a new <type>/<slug> branch off an up-to-date main.
argument-hint: <type>/<slug>  e.g. feat/add-arrays
allowed-tools: Bash(git status:*), Bash(git switch:*), Bash(git checkout:*), Bash(git pull:*), Bash(git branch:*)
---
Start a working branch named `$ARGUMENTS`.

1. Run `git status` — if the working tree is not clean, stop and tell me.
2. If `$ARGUMENTS` lacks a `feat/`, `fix/`, `refactor/`, or `chore/` prefix,
   prepend `feat/`.
3. Switch to `main` and `git pull` the latest.
4. Create and switch to the new branch.
5. Confirm the new branch name. Do not commit or push yet.

Never work directly on `main`.
