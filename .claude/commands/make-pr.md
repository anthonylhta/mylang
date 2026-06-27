---
description: Run full CI locally, then open a PR against main (never merge).
allowed-tools: Bash(npm run ci), Bash(git push:*), Bash(git rev-parse:*), Bash(git branch:*), Bash(gh pr create:*), Bash(gh pr view:*)
---
Open a pull request for the current branch.

1. Confirm we're not on `main` (stop if we are).
2. Run `npm run ci`. If it fails, stop and show the errors — do not open a PR.
3. Push the current branch to `origin` (set upstream if needed).
4. Open a PR against `main` with `gh pr create`. The title and body must follow
   the repo's commit voice: first person, plain capitalized sentences, one
   logical change, NO AI attribution, and no references to `notes/` or ADR
   numbers.
5. Stop at "PR open, green CI, ready for review." **Never merge the PR** — the
   maintainer merges on GitHub.
