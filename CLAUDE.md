# CLAUDE.md

## What this project is

mylang is a tiny programming language with a tree-walking interpreter written in
TypeScript. Source text flows through a hand-written lexer, a recursive-descent
parser into an AST, and a tree-walking evaluator. The v0 language supports
numbers, strings, booleans, `let` variables, arithmetic with correct precedence,
comparisons, `if`/`else`, `while`, `print`, and first-class functions with
closures — enough to run real programs like FizzBuzz and recursive Fibonacci.

## Stack

- **Language:** TypeScript (ESM, `NodeNext`).
- **Runtime (dev):** [tsx](https://tsx.is) — runs the `.ts` sources directly,
  no build step needed during development.
- **Tests:** [Vitest](https://vitest.dev).
- **Lint + format:** [Biome](https://biomejs.dev) (one tool for both).
- **Build:** `tsc` emits runnable ESM to `dist/`.

### Commands

| Task          | Command             | Notes                                        |
| ------------- | ------------------- | -------------------------------------------- |
| Dev / REPL    | `npm run dev`       | Interactive REPL (Ctrl+D to exit).           |
| Run a file    | `npx tsx src/index.ts <file>` | e.g. `examples/fizzbuzz.mylang`.   |
| Test          | `npm test`          | Vitest, single run.                          |
| Test (watch)  | `npm run test:watch`|                                              |
| Typecheck     | `npm run typecheck` | `tsc --noEmit`.                              |
| Lint          | `npm run lint`      | `biome check .`.                             |
| Lint (fix)    | `npm run lint:fix`  | `biome check --write .`.                     |
| Format        | `npm run format`    | `biome format --write .`.                    |
| Build         | `npm run build`     | Emits to `dist/` via `tsconfig.build.json`.  |
| Full CI       | `npm run ci`        | typecheck → lint → test → build.             |

Run `npm run ci` before opening a PR; it mirrors what CI runs.

## Repository rules

These are not optional. They keep the public history clean and reviewable.

### Commits

- Write in **first person**, as plain capitalized sentences
  ("Add modulo operator to the lexer", "Fix off-by-one in the column counter").
- **One logical change per commit.** Don't bundle unrelated edits.
- Do **not** narrate the process or who found what
  (no "as requested", "found a bug while testing", "per review feedback").
- **No AI / Claude attribution anywhere** — no `Co-Authored-By`, no
  "Generated with…", no tool names, in commit messages or PR bodies.
- Do **not** reference local notes or ADR numbers (e.g. "see ADR-004") in
  commits or PR bodies. `notes/` is gitignored, so those references resolve to
  nothing in the public history that recruiters may read.

### Branches & PRs

- `main` is **branch-protected**. Never commit or push to `main` directly.
- Every change goes on a branch named `<type>/<slug>` where `<type>` is one of
  `feat` `fix` `refactor` `chore` (e.g. `feat/add-arrays`, `fix/string-escapes`).
- Flow: branch → PR → green CI → review. Open the PR only once CI passes locally.
- **Never merge a PR.** The maintainer merges on GitHub. Stop at:
  "PR open, green CI, tested, ready for review."
- Merge permission is **per-PR** and never assumed to carry across features.
  If a PR is merged, that does not grant permission to merge the next one.

## Guardrails / boundaries

- **Stay in this project's tree.** Only create or modify files inside this
  repository. Don't touch files elsewhere on the system.
- **Confirm before anything hard to reverse or outward-facing:** deploys,
  `git push --force`, deleting or overwriting files you didn't create, changing
  repository settings, or sending data to external services. Ask first.
- **Read the real docs first.** Before writing code against a fast-moving
  dependency, read its *installed* docs/README/changelog (in `node_modules/` or
  via the tool's own `--help`). The current API may differ from training data.
  Heed deprecation notices and prefer the version actually installed here.
- Keep `main` green: if a change would break typecheck, lint, tests, or the
  build, fix it or don't open the PR.

## Layout

| Path                 | Responsibility                                   |
| -------------------- | ------------------------------------------------ |
| `src/lexer.ts`       | Source text → tokens                             |
| `src/ast.ts`         | AST node type definitions                        |
| `src/parser.ts`      | Tokens → AST (recursive descent)                 |
| `src/interpreter.ts` | Walks the AST; scopes and closures               |
| `src/errors.ts`      | `LexError` / `ParseError` / `RuntimeError`       |
| `src/index.ts`       | CLI: REPL and run-from-file                       |
| `examples/`          | Sample `.mylang` programs                         |
| `test/`              | Vitest tests (lexer, parser, examples e2e)       |
| `notes/`             | Local decision notes / ADRs — **gitignored**     |
