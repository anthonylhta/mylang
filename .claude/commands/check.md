---
description: Typecheck, lint, and test in parallel, then report pass/fail.
allowed-tools: Bash(npm run typecheck), Bash(npm run lint), Bash(npm test)
---
Run these three checks for this project **in parallel** — issue all three Bash
calls in a single message so they run concurrently:

- `npm run typecheck`
- `npm run lint`
- `npm test`

Then give me a concise summary: which passed, which failed, and the key errors
for any failures. Don't fix anything unless I ask.
